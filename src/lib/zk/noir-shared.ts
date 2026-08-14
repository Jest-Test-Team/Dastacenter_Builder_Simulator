/**
 * Encoding and statement checks shared by the Noir provers.
 *
 * Both the Node prover (`noir-prover.ts`, used in `npm run dev` and tests) and
 * the browser prover (`browser-prover.ts`, the one that ships to Cloudflare)
 * must encode witnesses and read public inputs identically — a proof made one
 * way has to verify the other. Keeping that logic here, with no runtime-specific
 * imports, is what stops the two from drifting apart.
 */

import {
  CIRCUIT_ID,
  type Proof,
  type PublicStatement,
  type VerificationResult,
  type Witness,
} from './types';

/** Circuit artefact produced by `nargo compile`. */
export interface NoirCircuit {
  bytecode: string;
  abi: unknown;
}

/** A proof and the public inputs it attests to, as bb.js returns them. */
export interface ProofBundle {
  proof: Uint8Array;
  publicInputs: string[];
}

/** The subset of a bb.js backend both provers use. */
export interface Backend {
  generateProof(witness: Uint8Array): Promise<ProofBundle>;
  verifyProof(bundle: ProofBundle): Promise<boolean>;
}

/** Splits a 32-byte hex string into two field-sized halves. */
export function splitHex(value: string): [string, string] {
  const hex = value.replace(/^0x/, '').padStart(64, '0').slice(-64);
  return [`0x${hex.slice(0, 32)}`, `0x${hex.slice(32)}`];
}

/**
 * Encodes a short ASCII label (the rule pack version) as a field element.
 *
 * Runtime-agnostic: `Buffer` is not available in every browser bundle, so this
 * hex-encodes the bytes by hand rather than reaching for it.
 */
export function labelToField(label: string): string {
  const bytes = new TextEncoder().encode(label).subarray(0, 31);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `0x${hex || '00'}`;
}

/** Builds the circuit's named inputs from a witness and the public claim. */
export function circuitInputs(witness: Witness, threshold: number, rulePackVersion: string) {
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

/** Hex-encodes proof bytes. */
export const toHex = (bytes: Uint8Array) =>
  `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;

/** Assembles the public statement from a proof's own public inputs. */
export function statementFromPublicInputs(
  publicInputs: string[],
  rulePackVersion: string,
  threshold: number,
): PublicStatement {
  const commitment = publicInputs.at(-1);
  if (!commitment) throw new Error('Proof carried no public commitment');
  return { commitment, rulePackVersion, threshold, circuit: CIRCUIT_ID };
}

/**
 * Checks a proof's *statement* — circuit tag, threshold, rule pack, and that the
 * public inputs agree with the statement. This is the half of verification that
 * needs no cryptography, so it runs anywhere, including the Cloudflare Workers
 * runtime where bb.js's WASM cannot load.
 *
 * A cryptographically valid proof of the wrong claim is still the wrong claim,
 * and this is what catches that. The SNARK check itself (see `verifyProof` on
 * the backends) happens where bb.js is available — in the browser, before a
 * mint is submitted.
 */
export function verifyProofStatement(
  proof: Proof,
  expected: { threshold?: number; rulePackVersion?: string } = {},
): VerificationResult {
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

  const [threshold, rulePack, commitment] = proof.publicInputs;
  if (BigInt(threshold ?? '0x0') !== BigInt(proof.statement.threshold))
    return { valid: false, reason: 'Statement threshold does not match the proof' };
  if (BigInt(rulePack ?? '0x0') !== BigInt(labelToField(proof.statement.rulePackVersion)))
    return { valid: false, reason: 'Statement rule pack does not match the proof' };
  if (commitment !== proof.statement.commitment)
    return { valid: false, reason: 'Statement commitment does not match the proof' };

  return { valid: true };
}
