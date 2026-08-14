/**
 * Client-side proof acquisition.
 *
 * The privacy story lives here. The graph digest is computed **in the browser**
 * from the local build; only the witness for the threshold claim ever leaves
 * the machine, and only as far as the operator's own proof endpoint. The
 * facility layout, the asset inventory and the exact PUE never travel.
 */

import type { BuildState } from '@/lib/blocks';
import { DEFAULT_THRESHOLD, type Proof } from './types';
import { witnessFromBuild } from './witness';

/**
 * Stages of proof acquisition, in order. Reported so the UI can show what is
 * actually happening rather than a spinner — the local/remote split is the
 * whole privacy claim, and it is worth making visible.
 */
export type ProofStage =
  | { stage: 'graph'; }
  | { stage: 'witness'; graphDigest: string; rulePackVersion: string; threshold: number }
  | { stage: 'proving' }
  | { stage: 'proved'; proof: Proof }
  | { stage: 'rejected'; message: string };

export interface AcquireProofOptions {
  threshold?: number;
  signal?: AbortSignal;
  /** Progress reporter. Never receives the build, the score, or the blinding. */
  onStage?: (event: ProofStage) => void;
}

export interface AcquiredProof {
  proof: Proof;
  /** Kept locally so the holder can later open the commitment to an auditor. */
  blindingFactor: string;
  graphDigest: string;
}

/**
 * Derives a witness locally and exchanges it for a threshold proof.
 *
 * Throws with the server's message when the build is below the bar — that is a
 * meaningful, user-facing outcome ("your build does not yet qualify"), not an
 * error to swallow.
 */
export async function acquireThresholdProof(
  state: BuildState,
  options: AcquireProofOptions = {},
): Promise<AcquiredProof> {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const report = options.onStage;

  report?.({ stage: 'graph' });
  const { witness, rulePackVersion } = await witnessFromBuild(state, { threshold });
  report?.({
    stage: 'witness',
    graphDigest: witness.graphDigest,
    rulePackVersion,
    threshold,
  });

  report?.({ stage: 'proving' });

  // Proving runs in the browser. bb.js ships a multi-megabyte WASM module that
  // the Cloudflare Workers runtime cannot load (no filesystem for its
  // `acvm_js_bg.wasm`), so the old `/api/zk/prove` round-trip 502s in
  // production. Doing it here also strengthens the privacy claim: the witness
  // never leaves the machine at all — only the finished proof does, at mint.
  const { BrowserProver } = await import('./browser-prover');
  const prover = new BrowserProver();

  let proof: Proof;
  try {
    proof = await prover.prove({ witness, threshold, rulePackVersion });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Proof generation failed`;
    report?.({ stage: 'rejected', message });
    throw new Error(message);
  }

  // Verify locally before it is ever submitted: a proof the holder's own
  // machine will not accept has no business being relayed to a mint.
  const check = await prover.verify(proof, { threshold, rulePackVersion });
  if (!check.valid) {
    const message = check.reason ?? 'Generated proof failed local verification';
    report?.({ stage: 'rejected', message });
    throw new Error(message);
  }

  report?.({ stage: 'proved', proof });

  return {
    proof,
    blindingFactor: witness.blindingFactor,
    graphDigest: witness.graphDigest,
  };
}
