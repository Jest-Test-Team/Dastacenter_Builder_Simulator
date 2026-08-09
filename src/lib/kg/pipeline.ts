/**
 * The pipeline: extract -> gate -> fuse -> index.
 *
 * Order matters and is not negotiable. Extraction happens against the ontology,
 * the gate runs before fusion (fusion multiplies whatever it is handed), and
 * only then is the graph safe to serve.
 */

import type { BuildState } from '@/lib/blocks';
import { extractAssets } from './extract/assets';
import { makeNode, provenance, type ExtractContext } from './extract/common';
import { extractEvents } from './extract/events';
import { extractNetwork } from './extract/network';
import { extractCooling, extractPower } from './extract/power';
import { extractSpaces } from './extract/spaces';
import { fuseGraph, type FusionReport } from './fuse';
import { runQualityGate, type QualityReport } from './gate';
import { assemble, type ExtractionResult, type KnowledgeGraph } from './types';

export interface BuildGraphOptions {
  /** Pin the clock so repeated runs produce identical provenance. */
  now?: number;
  /** Skip fusion. Only for tests that need to observe raw duplicates. */
  skipFusion?: boolean;
}

export interface GraphBuildResult {
  graph: KnowledgeGraph;
  quality: QualityReport;
  fusion: FusionReport;
}

/** Extractors in the order they run. Later ones may reference earlier nodes. */
export const EXTRACTORS = [
  extractSpaces,
  extractAssets,
  extractPower,
  extractCooling,
  extractNetwork,
  extractEvents,
] as const;

export function buildKnowledgeGraph(
  state: BuildState,
  options: BuildGraphOptions = {},
): GraphBuildResult {
  const now = options.now ?? Date.now();
  const rootLocalId = state.buildId || 'draft';
  const ctx: ExtractContext = { now, rootId: `Build:${rootLocalId}` };

  const root = makeNode(
    'Build',
    rootLocalId,
    state.name || 'Untitled build',
    {
      buildId: state.buildId,
      name: state.name,
      scenarioId: state.scenarioId,
      updatedAt: state.updatedAt,
    },
    provenance('pipeline', 'build', ctx),
  );

  const results: ExtractionResult[] = [
    { nodes: [root], edges: [] },
    ...EXTRACTORS.map((extract) => extract(state, ctx)),
  ];

  const raw = assemble(ctx.rootId, results);
  const gated = runQualityGate(raw);

  if (options.skipFusion)
    return {
      graph: gated.graph,
      quality: gated.report,
      fusion: { comparisons: 0, candidatePairs: 0, merges: [], reviewQueue: [] },
    };

  const fused = fuseGraph(gated.graph);
  return { graph: fused.graph, quality: gated.report, fusion: fused.report };
}
