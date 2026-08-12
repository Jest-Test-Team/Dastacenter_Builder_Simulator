/**
 * Midnight proof-server adapter. CURRENTLY NON-FUNCTIONAL BY DESIGN.
 *
 * Kept because the Compact circuit, its keys and `openCommitment` are real and
 * still useful, and because the moment Midnight ships a compiler generation
 * that matches its proof server this becomes viable again. It is no longer the
 * app's prover: `NoirProver` is, and it produces genuine proofs today.
 *
 * Why this cannot work right now, established by testing (docs/MIDNIGHT_ZK.md):
 *
 *  - `POST /prove` takes a *binary* `ProofPreimageVersioned`, not the JSON this
 *    adapter was written to send.
 *  - There is no `/verify` endpoint at all. It 404s. Verification is local.
 *  - Compact 0.31.1 — the newest released compiler, which built
 *    `circuits/build` — pins runtime 0.16.0, which emits the older unversioned
 *    preimage. Proof-server images 2.0.7, 3.0.7, 4.0.0 and latest all reject
 *    it. Framing it with ledger-v9 is accepted but then never returns.
 *
 * So rather than issue calls that cannot succeed and surface as confusing 400s,
 * `prove` and `verify` fail immediately with the actual reason.
 */

import {
  CIRCUIT_ID,
  ProofError,
  type Proof,
  type ProveRequest,
  type Prover,
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
    const { witness, threshold } = request;

    // Fail fast rather than paying for a proof attempt that the circuit's own
    // assert would reject anyway.
    if (witness.score < threshold)
      throw new ProofError(
        422,
        `Score is below the threshold; no proof exists for this build at ${threshold}`,
      );

    throw new ProofError(
      503,
      'The Midnight proof server cannot prove this circuit: the released Compact ' +
        'compiler (0.31.1, runtime 0.16.0) emits an unversioned proof preimage that ' +
        'every published proof-server image rejects. Unset MIDNIGHT_PROOF_SERVER_URL ' +
        'to use the Noir prover, which produces real proofs. See docs/MIDNIGHT_ZK.md.',
    );
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

    // The proof server has no /verify endpoint - it 404s. Verifying a Midnight
    // proof means checking it locally against the verifier key, which this
    // adapter cannot do while proving is broken anyway. Saying so is better
    // than reporting "proof rejected" for what is actually a missing route.
    return {
      valid: false,
      reason:
        'The Midnight proof server exposes no /verify endpoint; this adapter cannot ' +
        'verify while its proving path is blocked. See docs/MIDNIGHT_ZK.md.',
    };
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
