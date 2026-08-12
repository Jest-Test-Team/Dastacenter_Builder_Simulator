/**
 * Noir + Barretenberg prover. This is the real one.
 *
 * Proves `circuits/noir/src/main.nr`: the holder knows a design whose graph
 * digest is D and whose score cleared threshold T under rule pack V. The
 * commitment is a *public output* of the circuit rather than an input, so a
 * prover cannot publish a commitment that disagrees with the witness it proved
 * about.
 *
 * Why Noir rather than Midnight: the Compact toolchain and every published
 * Midnight proof-server image are a protocol generation apart, so no released
 * combination can prove this circuit today — see docs/MIDNIGHT_ZK.md for the
 * evidence. Noir has no such gap and proves in ~2s.
 *
 * Everything here is Node-only: bb.js carries a multi-megabyte WASM module and
 * will not run in the Cloudflare Workers runtime. Both libraries and the
 * compiled circuit are therefore loaded lazily, inside the call — a static
 * import would drag the WASM into the edge bundle and break the build.
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

/** Circuit artefact produced by `nargo compile`. */
const CIRCUIT_PATH = 'circuits/noir/target/datacenter_score.json';

interface NoirCircuit {
  bytecode: string;
  abi: unknown;
}

interface ProofBundle {
  proof: Uint8Array;
  publicInputs: string[];
}

interface Backend {
  generateProof(witness: Uint8Array): Promise<ProofBundle>;
  verifyProof(bundle: ProofBundle): Promise<boolean>;
}

let cached: { circuit: NoirCircuit; makeBackend: () => Promise<Backend>; execute: (inputs: Record<string, string>) => Promise<{ witness: Uint8Array; returnValue: unknown }> } | null = null;

/**
 * Loads the circuit and both WASM libraries once, on first use.
 *
 * `circuits/noir/target` is committed, so a checkout can prove without the Noir
 * toolchain installed — only `nargo compile` needs nargo.
 */
async function load() {
  if (cached) return cached;

  const [{ Noir }, bb, { readFile }, path] = await Promise.all([
    import('@noir-lang/noir_js'),
    import('@aztec/bb.js'),
    import('node:fs/promises'),
    import('node:path'),
  ]);

  let raw: string;
  try {
    raw = await readFile(path.join(process.cwd(), CIRCUIT_PATH), 'utf8');
  } catch {
    throw new ProofError(
      503,
      `Compiled circuit not found at ${CIRCUIT_PATH}. Run \`npm run zk:noir:compile\`.`,
    );
  }

  const circuit = JSON.parse(raw) as NoirCircuit;
  const noir = new Noir(circuit as never);

  cached = {
    circuit,
    execute: (inputs) => noir.execute(inputs as never) as Promise<{ witness: Uint8Array; returnValue: unknown }>,
    makeBackend: async () => {
      const api = await bb.Barretenberg.new();
      return new bb.UltraHonkBackend(circuit.bytecode, api) as unknown as Backend;
    },
  };
  return cached;
}

/** Splits a 32-byte hex string into two field-sized halves. */
function splitHex(value: string): [string, string] {
  const hex = value.replace(/^0x/, '').padStart(64, '0').slice(-64);
  return [`0x${hex.slice(0, 32)}`, `0x${hex.slice(32)}`];
}

/** Encodes a short ASCII label (the rule pack version) as a field element. */
function labelToField(label: string): string {
  const hex = Buffer.from(label, 'utf8').subarray(0, 31).toString('hex');
  return `0x${hex || '00'}`;
}

function circuitInputs(witness: Witness, threshold: number, rulePackVersion: string) {
  const [digestHi, digestLo] = splitHex(witness.graphDigest);
  const [blindingHi, blindingLo] = splitHex(witness.blindingFactor);
  return {
    digest_hi: digestHi,
    digest_lo: digestLo,
    blinding_hi: blindingHi,
    blinding_lo: blindingLo,
    score: String(Math.max(0, Math.floor(witness.score))),
    threshold: String(Math.max(0, Math.floor(threshold))),
    rule_pack: labelToField(rulePackVersion),
  };
}

const toHex = (bytes: Uint8Array) =>
  `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;

export class NoirProver implements Prover {
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

    // The circuit returns the commitment, so read it from the proof's own
    // public inputs rather than trusting anything computed alongside.
    const commitment = bundle.publicInputs.at(-1);
    if (!commitment) throw new ProofError(502, 'Proof carried no public commitment');

    const statement: PublicStatement = {
      commitment,
      rulePackVersion,
      threshold,
      circuit: CIRCUIT_ID,
    };

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
    // Statement checks first: cheap, and a cryptographically valid proof of the
    // wrong claim is still the wrong claim.
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

    if (!proof.publicInputs?.length)
      return { valid: false, reason: 'Proof carried no public inputs' };

    // The public inputs are what the proof actually attests to, so they must be
    // checked against the statement — otherwise a valid proof could be shipped
    // beside a statement claiming something else entirely.
    const [threshold, rulePack, commitment] = proof.publicInputs;
    if (BigInt(threshold ?? '0x0') !== BigInt(proof.statement.threshold))
      return { valid: false, reason: 'Statement threshold does not match the proof' };
    if (BigInt(rulePack ?? '0x0') !== BigInt(labelToField(proof.statement.rulePackVersion)))
      return { valid: false, reason: 'Statement rule pack does not match the proof' };
    if (commitment !== proof.statement.commitment)
      return { valid: false, reason: 'Statement commitment does not match the proof' };

    const { makeBackend } = await load();
    const backendInstance = await makeBackend();
    const bytes = Uint8Array.from(
      (proof.proof.replace(/^0x/, '').match(/../g) ?? []).map((pair) => parseInt(pair, 16)),
    );

    try {
      const valid = await backendInstance.verifyProof({
        proof: bytes,
        publicInputs: proof.publicInputs,
      });
      return valid ? { valid: true } : { valid: false, reason: 'Proof rejected by verifier' };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Selective disclosure. Re-runs the circuit on a revealed digest and blinding
   * and returns the commitment it derives, so an auditor under NDA can confirm
   * they reproduce the published commitment without the design ever being
   * public. No proof is generated — this is the escape hatch, not the default.
   */
  async open(witness: Witness, rulePackVersion: string): Promise<string> {
    const { execute } = await load();
    const { returnValue } = await execute(
      circuitInputs(witness, Math.min(witness.score, 0), rulePackVersion),
    );
    return String(returnValue);
  }
}
