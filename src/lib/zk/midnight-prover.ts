/**
 * Midnight proof-server adapter.
 *
 * Talks to a running Midnight proof server (the Docker image published by
 * midnight-ntwrk) over HTTP, using the artefacts produced by compiling
 * `circuits/datacenter-score.compact` with `compactc`.
 *
 * This path is inert unless MIDNIGHT_PROOF_SERVER_URL is set. That is not a
 * convenience: `compactc` and the proof server cannot run inside vitest,
 * Playwright, or the Cloudflare Workers runtime, so tests and the edge deploy
 * use MockProver. See docs/MIDNIGHT_ZK.md for the local setup that lights this
 * up, and for what has and has not been exercised end to end.
 */

import {
  CIRCUIT_ID,
  ProofError,
  type Proof,
  type ProveRequest,
  type Prover,
  type PublicStatement,
  type VerificationResult,
  type Witness,
} from './types';

interface CompiledContract {
  pureCircuits: {
    openCommitment(digest: Uint8Array, blinding: Uint8Array, packVersion: Uint8Array): Uint8Array;
  };
}

/**
 * Loads the artefacts `compactc` produced. Required only by `open()`; proving
 * and verifying go through the proof server and do not need this.
 */
function loadCompiledContract(): CompiledContract {
  try {
    // Resolved at call time so a checkout without the toolchain still imports
    // this module. Note the build output *is* committed under circuits/build,
    // so bundlers can follow this path: keep this module off any browser import
    // chain (see ./witness) or the Compact runtime's WASM lands in the bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../../circuits/build/contract/index.js') as CompiledContract;
  } catch {
    throw new ProofError(
      503,
      'Compiled circuit not found. Run `npm run zk:compile` (needs the Compact toolchain).',
    );
  }
}

/** Pads or truncates a hex string or plain label into the circuit's Bytes<32>. */
function toBytes32(value: string): Uint8Array {
  const buffer = new Uint8Array(32);
  if (/^0x[0-9a-fA-F]*$/.test(value)) {
    const hex = value.slice(2);
    const pairs = hex.match(/../g) ?? [];
    buffer.set(pairs.slice(0, 32).map((pair) => parseInt(pair, 16)));
    return buffer;
  }
  buffer.set(new TextEncoder().encode(value).slice(0, 32));
  return buffer;
}

export interface MidnightProverOptions {
  /** Base URL of the proof server, e.g. http://127.0.0.1:6300 */
  url: string;
  /** Compiled circuit key name; matches the exported circuit in the .compact file. */
  circuitName?: string;
  /** Milliseconds before a proof attempt is abandoned. Proving is slow. */
  timeoutMs?: number;
}

interface ProveResponse {
  proof?: string;
  publicInputs?: { commitment?: string };
  error?: string;
}

async function post<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok)
      throw new ProofError(502, `Proof server returned ${response.status}: ${await response.text()}`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ProofError) throw error;
    if (error instanceof Error && error.name === 'AbortError')
      throw new ProofError(504, `Proof server timed out after ${timeoutMs}ms`);
    throw new ProofError(502, error instanceof Error ? error.message : 'Proof server unreachable');
  } finally {
    clearTimeout(timer);
  }
}

export class MidnightProver implements Prover {
  readonly backend = 'midnight' as const;
  private readonly url: string;
  private readonly circuitName: string;
  private readonly timeoutMs: number;

  constructor(options: MidnightProverOptions) {
    this.url = options.url.replace(/\/$/, '');
    this.circuitName = options.circuitName ?? 'proveThreshold';
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async prove(request: ProveRequest): Promise<Proof> {
    const { witness, threshold, rulePackVersion } = request;

    // Fail fast rather than paying for a proof attempt that the circuit's own
    // assert would reject anyway.
    if (witness.competitionScore < threshold)
      throw new ProofError(
        422,
        `Score is below the threshold; no proof exists for this build at ${threshold}`,
      );

    const response = await post<ProveResponse>(
      `${this.url}/prove`,
      {
        circuit: this.circuitName,
        // Public arguments, in the order the circuit declares them.
        publicArgs: [threshold, rulePackVersion],
        // Witness values. These leave the process only to the operator's own
        // local proof server — never to a third party.
        witness: {
          graphDigest: witness.graphDigest,
          competitionScore: witness.competitionScore,
          blindingFactor: witness.blindingFactor,
        },
      },
      this.timeoutMs,
    );

    if (response.error) throw new ProofError(502, response.error);
    if (!response.proof || !response.publicInputs?.commitment)
      throw new ProofError(502, 'Proof server returned no proof');

    const statement: PublicStatement = {
      commitment: response.publicInputs.commitment,
      rulePackVersion,
      threshold,
      circuit: CIRCUIT_ID,
    };
    return { statement, proof: response.proof, backend: this.backend, createdAt: Date.now() };
  }

  async verify(
    proof: Proof,
    expected: { threshold?: number; rulePackVersion?: string } = {},
  ): Promise<VerificationResult> {
    // Statement-level checks run locally first; they are cheap, and a proof for
    // the wrong claim is invalid however cryptographically sound it is.
    if (proof.statement.circuit !== CIRCUIT_ID)
      return { valid: false, reason: `Unknown circuit ${proof.statement.circuit}` };
    if (expected.threshold !== undefined && proof.statement.threshold < expected.threshold)
      return {
        valid: false,
        reason: `Proof clears ${proof.statement.threshold}, below the required ${expected.threshold}`,
      };
    if (expected.rulePackVersion && proof.statement.rulePackVersion !== expected.rulePackVersion)
      return {
        valid: false,
        reason: `Proof was made under rule pack ${proof.statement.rulePackVersion}`,
      };

    const response = await post<{ valid?: boolean; error?: string }>(
      `${this.url}/verify`,
      {
        circuit: this.circuitName,
        proof: proof.proof,
        publicInputs: {
          commitment: proof.statement.commitment,
          threshold: proof.statement.threshold,
          rulePackVersion: proof.statement.rulePackVersion,
        },
      },
      this.timeoutMs,
    );

    if (response.error) return { valid: false, reason: response.error };
    return response.valid === true ? { valid: true } : { valid: false, reason: 'Proof rejected by verifier' };
  }

  /**
   * Selective disclosure, computed locally.
   *
   * `openCommitment` is declared pure in the circuit — `compactc` reports
   * `"pure": true, "proof": false` — so the compiled artefact runs it in-process
   * with no proof server and no Docker. Round-tripping it through the server
   * (as this did originally) would make an auditor's re-derivation depend on
   * infrastructure that the operation does not actually need.
   */
  async open(witness: Witness, rulePackVersion: string): Promise<string> {
    const { pureCircuits } = loadCompiledContract();
    const commitment = pureCircuits.openCommitment(
      toBytes32(witness.graphDigest),
      toBytes32(witness.blindingFactor),
      toBytes32(rulePackVersion),
    );
    return `0x${[...commitment].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
}
