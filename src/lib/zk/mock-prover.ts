/**
 * Deterministic mock prover.
 *
 * This is NOT a zero-knowledge proof system. It reproduces the *interface* and
 * the *decision behaviour* of one — the same commitment binding, the same
 * refusal to prove a below-threshold score, the same rejection of a tampered
 * statement — so that every test exercises the real wiring rather than a stub.
 *
 * It is used wherever a real proof cannot run: unit tests, Playwright, CI, and
 * the Cloudflare edge runtime. The security property it does *not* provide is
 * soundness: anyone can forge a mock proof, because verification only re-runs
 * the same hash. Selecting this backend in production is refused outright in
 * `getProver()`.
 */

import { sha256Hex } from '@/lib/kg';
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

/**
 * Mirrors the circuit's `persistentHash([digest, blinding, packVersion, tag])`.
 * Binding the pack version and the tag into the commitment is what stops a
 * proof made under a lax rule pack being replayed as a strict one.
 */
export async function commitmentOf(witness: Witness, rulePackVersion: string): Promise<string> {
  return sha256Hex(
    [witness.graphDigest, witness.blindingFactor, rulePackVersion, CIRCUIT_ID].join('|'),
  );
}

/** Stand-in for the proof bytes: bound to the statement and to the witness. */
async function proofBytes(statement: PublicStatement, witness: Witness): Promise<string> {
  return sha256Hex(
    [
      statement.commitment,
      statement.rulePackVersion,
      String(statement.threshold),
      statement.circuit,
      // The score is inside the proof but never inside the statement — this is
      // the line the whole design defends.
      String(witness.score >= statement.threshold),
    ].join('|'),
  );
}

export class MockProver implements Prover {
  readonly backend = 'mock' as const;

  async prove(request: ProveRequest): Promise<Proof> {
    const { witness, threshold, rulePackVersion } = request;
    if (!witness.graphDigest) throw new ProofError(400, 'Missing graph digest');
    if (!witness.blindingFactor) throw new ProofError(400, 'Missing blinding factor');
    if (!Number.isFinite(witness.score))
      throw new ProofError(400, 'Missing competition score');

    // The circuit's assert, in TypeScript. A below-threshold build has no proof
    // — the request fails rather than returning an invalid one.
    if (witness.score < threshold)
      throw new ProofError(
        422,
        `Score is below the threshold; no proof exists for this build at ${threshold}`,
      );

    const statement: PublicStatement = {
      commitment: await commitmentOf(witness, rulePackVersion),
      rulePackVersion,
      threshold,
      circuit: CIRCUIT_ID,
    };

    return {
      statement,
      proof: await proofBytes(statement, witness),
      backend: this.backend,
      createdAt: Date.now(),
    };
  }

  async verify(
    proof: Proof,
    expected: { threshold?: number; rulePackVersion?: string } = {},
  ): Promise<VerificationResult> {
    if (proof.statement.circuit !== CIRCUIT_ID)
      return { valid: false, reason: `Unknown circuit ${proof.statement.circuit}` };
    if (expected.threshold !== undefined && proof.statement.threshold < expected.threshold)
      return {
        valid: false,
        reason: `Proof clears ${proof.statement.threshold}, which is below the required ${expected.threshold}`,
      };
    if (expected.rulePackVersion && proof.statement.rulePackVersion !== expected.rulePackVersion)
      return {
        valid: false,
        reason: `Proof was made under rule pack ${proof.statement.rulePackVersion}, expected ${expected.rulePackVersion}`,
      };

    // Recompute the proof bytes from the statement alone. A tampered
    // commitment, threshold or pack version no longer reproduces them.
    const expectedBytes = await proofBytes(proof.statement, {
      graphDigest: '',
      blindingFactor: '',
      score: proof.statement.threshold,
    });
    if (expectedBytes !== proof.proof) return { valid: false, reason: 'Proof does not match its statement' };

    return { valid: true };
  }

  async open(witness: Witness, rulePackVersion: string): Promise<string> {
    return commitmentOf(witness, rulePackVersion);
  }
}
