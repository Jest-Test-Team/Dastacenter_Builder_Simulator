/**
 * Zero-knowledge threshold proofs over the facility knowledge graph.
 *
 * The claim is deliberately narrow: "a design exists behind this commitment
 * that the named rule pack scored at or above this threshold". Everything that
 * makes the design valuable — layout, PUE, cooling topology, asset inventory —
 * stays on the operator's machine.
 */

/** The statement a verifier sees. Nothing here reveals the design. */
export interface PublicStatement {
  /** Blinded commitment to the graph digest. */
  commitment: string;
  /** Which rule pack judged the build. */
  rulePackVersion: string;
  /** The bar that was cleared. */
  threshold: number;
  /** Circuit identifier, so a verifier can pin the exact statement shape. */
  circuit: string;
}

/** What the prover holds and never transmits. */
export interface Witness {
  /** Canonical knowledge-graph digest — the whole design, in one hash. */
  graphDigest: string;
  /** The competition score the rule pack produced. */
  competitionScore: number;
  /** Randomness that stops an observer confirming a guessed design. */
  blindingFactor: string;
}

export interface Proof {
  statement: PublicStatement;
  /** Opaque proof bytes, hex-encoded. Shape depends on the backend. */
  proof: string;
  /** Which backend produced it. Never trusted for verification decisions. */
  backend: 'midnight' | 'mock';
  createdAt: number;
}

export interface ProveRequest {
  witness: Witness;
  threshold: number;
  rulePackVersion: string;
}

/**
 * The prover boundary.
 *
 * Two implementations satisfy it: a Midnight adapter that talks to a real proof
 * server, and a deterministic mock. Both are held to the same interface so the
 * code under test is the code that ships — only the backend swaps.
 */
export interface Prover {
  readonly backend: Proof['backend'];
  prove(request: ProveRequest): Promise<Proof>;
  verify(proof: Proof, expected?: { threshold?: number; rulePackVersion?: string }): Promise<VerificationResult>;
  /** Re-derives the commitment from a revealed digest — selective disclosure. */
  open(witness: Witness, rulePackVersion: string): Promise<string>;
}

export interface VerificationResult {
  valid: boolean;
  /** Why it failed. Empty when valid. */
  reason?: string;
}

/** The default bar, matching the hackathon narrative's "score ≥ 85". */
export const DEFAULT_THRESHOLD = 85;

/** Circuit identifier. Bumped whenever the statement shape changes. */
export const CIRCUIT_ID = 'datacenter-score/v1';

export class ProofError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ProofError';
  }
}
