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
  const response = await fetch('/api/zk/prove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ witness, threshold, rulePackVersion }),
    signal: options.signal,
  });

  const body = (await response.json().catch(() => null)) as { proof?: Proof; error?: string } | null;
  if (!response.ok || !body?.proof) {
    const message = body?.error ?? `Proof generation failed (${response.status})`;
    report?.({ stage: 'rejected', message });
    throw new Error(message);
  }
  report?.({ stage: 'proved', proof: body.proof });

  return {
    proof: body.proof,
    blindingFactor: witness.blindingFactor,
    graphDigest: witness.graphDigest,
  };
}
