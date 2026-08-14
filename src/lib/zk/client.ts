/**
 * Client-side proof acquisition.
 *
 * The privacy story lives here. The graph digest is computed **in the browser**
 * from the local build; only the witness for the threshold claim ever leaves
 * the machine, and only as far as the operator's own proof endpoint. The
 * facility layout, the asset inventory and the exact PUE never travel.
 */

import type { BuildState } from '@/lib/blocks';
import { CIRCUIT_ID, DEFAULT_THRESHOLD, type Proof } from './types';
import { witnessFromBuild } from './witness';

/**
 * Stages of proof acquisition, in order. Reported so the UI can show what is
 * actually happening rather than a spinner — the local/remote split is the
 * whole privacy claim, and it is worth making visible.
 */
export type ProofStage =
  | { stage: 'graph'; nodeCount?: number; edgeCount?: number }
  | {
      stage: 'witness';
      graphDigest: string;
      commitment?: string;
      rulePackVersion: string;
      threshold: number;
      circuit: string;
    }
  | { stage: 'backend'; name: string }
  | { stage: 'proving' }
  | { stage: 'proved'; proof: Proof; proofBytes: number; publicInputCount: number; elapsedMs: number }
  | { stage: 'verifying' }
  | { stage: 'verified'; ok: boolean; elapsedMs: number }
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
  const { witness, rulePackVersion, graphNodeCount, graphEdgeCount } = await witnessFromBuild(
    state,
    { threshold },
  );
  report?.({ stage: 'graph', nodeCount: graphNodeCount, edgeCount: graphEdgeCount });
  report?.({
    stage: 'witness',
    graphDigest: witness.graphDigest,
    rulePackVersion,
    threshold,
    circuit: CIRCUIT_ID,
  });

  // Proving runs in the browser. bb.js ships a multi-megabyte WASM module that
  // the Cloudflare Workers runtime cannot load (no filesystem for its
  // `acvm_js_bg.wasm`), so the old `/api/zk/prove` round-trip 502s in
  // production. Doing it here also strengthens the privacy claim: the witness
  // never leaves the machine at all — only the finished proof does, at mint.
  report?.({ stage: 'backend', name: 'Noir + Barretenberg UltraHonk (WASM)' });
  const { BrowserProver } = await import('./browser-prover');
  const prover = new BrowserProver();

  report?.({ stage: 'proving' });
  const proveStart = Date.now();
  let proof: Proof;
  try {
    proof = await prover.prove({ witness, threshold, rulePackVersion });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Proof generation failed`;
    report?.({ stage: 'rejected', message });
    throw new Error(message);
  }
  const proofBytes = Math.floor(proof.proof.replace(/^0x/, '').length / 2);
  report?.({
    stage: 'proved',
    proof,
    proofBytes,
    publicInputCount: proof.publicInputs?.length ?? 0,
    elapsedMs: Date.now() - proveStart,
  });

  // Verify locally before it is ever submitted: a proof the holder's own
  // machine will not accept has no business being relayed to a mint.
  report?.({ stage: 'verifying' });
  const verifyStart = Date.now();
  const check = await prover.verify(proof, { threshold, rulePackVersion });
  if (!check.valid) {
    const message = check.reason ?? 'Generated proof failed local verification';
    report?.({ stage: 'rejected', message });
    throw new Error(message);
  }
  report?.({ stage: 'verified', ok: true, elapsedMs: Date.now() - verifyStart });

  return {
    proof,
    blindingFactor: witness.blindingFactor,
    graphDigest: witness.graphDigest,
  };
}
