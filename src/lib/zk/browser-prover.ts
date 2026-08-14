/**
 * Noir + Barretenberg prover that runs entirely in the browser.
 *
 * This is the prover the deployed app uses. The server route cannot: on
 * Cloudflare Workers bb.js's WASM has no filesystem to read `acvm_js_bg.wasm`
 * from, so `/api/zk/prove` 502s there. In the browser both libraries load their
 * WASM the way they were designed to, and the design never leaves the machine —
 * the witness is derived locally and the proof is generated locally too. Only
 * the finished proof (carrying just the public statement) is sent on to mint.
 *
 * The circuit JSON is imported statically so it is bundled into this lazily
 * loaded chunk; both heavy libraries are dynamically imported inside the call so
 * their multi-megabyte WASM only downloads when the user actually proves.
 */

import circuitJson from '../../../circuits/noir/target/datacenter_score.json';
import {
  ProofError,
  type Proof,
  type ProveRequest,
  type Prover,
  type PublicStatement,
  type VerificationResult,
  type Witness,
} from './types';
import {
  circuitInputs,
  statementFromPublicInputs,
  toHex,
  verifyProofStatement,
  type Backend,
  type NoirCircuit,
} from './noir-shared';

const circuit = circuitJson as unknown as NoirCircuit;

interface Loaded {
  execute: (
    inputs: Record<string, string>,
  ) => Promise<{ witness: Uint8Array; returnValue: unknown }>;
  makeBackend: () => Promise<Backend>;
}

let cached: Loaded | null = null;

/** Loads noir_js + bb.js and binds them to the bundled circuit, once. */
async function load(): Promise<Loaded> {
  if (cached) return cached;

  const [{ Noir }, bb] = await Promise.all([
    import('@noir-lang/noir_js'),
    import('@aztec/bb.js'),
  ]);

  const noir = new Noir(circuit as never);

  cached = {
    execute: (inputs) =>
      noir.execute(inputs as never) as Promise<{ witness: Uint8Array; returnValue: unknown }>,
    makeBackend: async () => {
      // Single-threaded: a plain https page is not cross-origin isolated, so
      // SharedArrayBuffer (and bb.js's worker pool) is unavailable. Forcing one
      // thread on the Barretenberg instance avoids that requirement — proving is
      // a couple of seconds slower but works on any page.
      const api = await bb.Barretenberg.new({ threads: 1 });
      return new bb.UltraHonkBackend(circuit.bytecode, api) as unknown as Backend;
    },
  };
  return cached;
}

export class BrowserProver implements Prover {
  readonly backend = 'noir' as const;

  async prove(request: ProveRequest): Promise<Proof> {
    const { witness, threshold, rulePackVersion } = request;

    // Fail fast with a useful message. The circuit would reject it anyway, but
    // "Cannot satisfy constraint" is not something to show a user.
    if (witness.score < threshold)
      throw new ProofError(
        422,
        `Score is below the threshold; no proof exists for this build at ${threshold}`,
      );

    const { execute, makeBackend } = await load();
    const inputs = circuitInputs(witness, threshold, rulePackVersion);

    let executed;
    try {
      executed = await execute(inputs);
    } catch (error) {
      throw new ProofError(
        422,
        `Witness does not satisfy the circuit: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    const backendInstance = await makeBackend();
    const bundle = await backendInstance.generateProof(executed.witness);

    let statement: PublicStatement;
    try {
      statement = statementFromPublicInputs(bundle.publicInputs, rulePackVersion, threshold);
    } catch {
      throw new ProofError(502, 'Proof carried no public commitment');
    }

    return {
      statement,
      proof: toHex(bundle.proof),
      publicInputs: bundle.publicInputs,
      backend: this.backend,
      createdAt: Date.now(),
    };
  }

  async verify(
    proof: Proof,
    expected: { threshold?: number; rulePackVersion?: string } = {},
  ): Promise<VerificationResult> {
    const statementCheck = verifyProofStatement(proof, expected);
    if (!statementCheck.valid) return statementCheck;

    const { makeBackend } = await load();
    const backendInstance = await makeBackend();
    const bytes = Uint8Array.from(
      (proof.proof.replace(/^0x/, '').match(/../g) ?? []).map((pair) => parseInt(pair, 16)),
    );

    try {
      const valid = await backendInstance.verifyProof({
        proof: bytes,
        // Guaranteed present: verifyProofStatement rejects an empty publicInputs.
        publicInputs: proof.publicInputs ?? [],
      });
      return valid ? { valid: true } : { valid: false, reason: 'Proof rejected by verifier' };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /** Selective disclosure — re-runs the circuit to re-derive the commitment. */
  async open(witness: Witness, rulePackVersion: string): Promise<string> {
    const { execute } = await load();
    const { returnValue } = await execute(
      circuitInputs(witness, Math.min(witness.score, 0), rulePackVersion),
    );
    return String(returnValue);
  }
}
