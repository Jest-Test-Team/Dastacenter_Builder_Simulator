/**
 * The build-to-witness bridge.
 *
 * Kept apart from `./index` on purpose. This code runs in the browser, and the
 * barrel re-exports `MidnightProver`, which pulls the Compact runtime and its
 * WebAssembly into whatever bundle imports it. Importing the witness helpers
 * from here keeps the client free of a Node-only proof-server adapter it can
 * never call.
 */

import type { BuildState } from '@/lib/blocks';
import { buildKnowledgeGraph, graphDigest } from '@/lib/kg';
import { score } from '@/lib/scoring';
import { DEFAULT_THRESHOLD, type Witness } from './types';

/** Cryptographically random blinding factor, hex-encoded. */
export function randomBlindingFactor(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export interface WitnessResult {
  witness: Witness;
  rulePackVersion: string;
  /** The score, returned for the caller's own UI. Never put in a statement. */
  score: number;
  threshold: number;
  /** Size of the fused knowledge graph the digest commits to (for progress UI). */
  graphNodeCount: number;
  graphEdgeCount: number;
}

/**
 * Turns a build into a witness.
 *
 * Runs the full knowledge-graph pipeline first, because the digest must commit
 * to the *fused* graph — the same graph the app serves and the same one a
 * verifier would rebuild. Proving against an unfused graph would produce a
 * commitment nobody else can reproduce.
 */
export async function witnessFromBuild(
  state: BuildState,
  options: { threshold?: number; blindingFactor?: string } = {},
): Promise<WitnessResult> {
  const { graph } = buildKnowledgeGraph(state);
  const report = score(state);
  const digest = await graphDigest(graph);

  return {
    witness: {
      graphDigest: digest,
      // The 0-100 rating, not the 0-1000 competition score. DEFAULT_THRESHOLD
      // is 85, and comparing that against a 0-1000 metric would make the claim
      // "score >= 85" one that any scoring build clears by a factor of ten.
      score: report.score,
      blindingFactor: options.blindingFactor ?? randomBlindingFactor(),
    },
    rulePackVersion: report.rulePackVersion,
    score: report.score,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
    graphNodeCount: Object.keys(graph.nodes).length,
    graphEdgeCount: Object.keys(graph.edges).length,
  };
}
