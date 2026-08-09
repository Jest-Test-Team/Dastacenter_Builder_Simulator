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
import { witnessFromBuild } from './index';

export interface AcquireProofOptions {
  threshold?: number;
  signal?: AbortSignal;
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
  const { witness, rulePackVersion } = await witnessFromBuild(state, { threshold });

  const response = await fetch('/api/zk/prove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ witness, threshold, rulePackVersion }),
    signal: options.signal,
  });

  const body = (await response.json().catch(() => null)) as { proof?: Proof; error?: string } | null;
  if (!response.ok || !body?.proof)
    throw new Error(body?.error ?? `Proof generation failed (${response.status})`);

  return {
    proof: body.proof,
    blindingFactor: witness.blindingFactor,
    graphDigest: witness.graphDigest,
  };
}
