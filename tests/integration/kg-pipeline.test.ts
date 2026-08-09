/**
 * Pipeline integration: the whole 9-stage run over the real demo builds.
 *
 * The unit tests use small hand-built fixtures; these run the shipped demo
 * snapshots, which are the largest and messiest states the app can actually
 * produce. Anything that breaks only at real scale shows up here.
 */

import { describe, expect, it } from 'vitest';
import { emptyState, type BuildState } from '@/lib/blocks';
import { DEMO_BUILDS } from '@/lib/demos';
import {
  PRECISION_THRESHOLD,
  buildKnowledgeGraph,
  digestPreimage,
  graphDigest,
  runQualityGate,
  type GraphBuildResult,
} from '@/lib/kg';

const FIXED_NOW = 1_700_000_000_000;

/** Demo snapshots are BuildSnapshots — a superset of the pure BuildState. */
function stateOf(snapshot: unknown): BuildState {
  return { ...emptyState(), ...(snapshot as BuildState) };
}

const CASES = DEMO_BUILDS.map((demo) => [demo.id, stateOf(demo.snapshot)] as const);

function run(state: BuildState): GraphBuildResult {
  return buildKnowledgeGraph(state, { now: FIXED_NOW });
}

describe.each(CASES)('demo build: %s', (id, state) => {
  const result = run(state);

  it('clears the precision gate with nothing rejected', () => {
    expect(result.quality.rejections).toEqual([]);
    expect(result.quality.precision).toBeGreaterThanOrEqual(PRECISION_THRESHOLD);
    expect(result.quality.passed).toBe(true);
  });

  it('populates every plane the model depends on', () => {
    for (const type of ['Build', 'Space', 'Asset', 'AssetType', 'ScoreEvaluated', 'PolicySetting'])
      expect(result.quality.nodesByType[type], `${id}: ${type} plane is empty`).toBeGreaterThan(0);
  });

  it('leaves no node stranded except the ones the gate reports', () => {
    for (const nodeId of Object.keys(result.graph.nodes)) {
      const connected =
        (result.graph.outgoing[nodeId]?.length ?? 0) + (result.graph.incoming[nodeId]?.length ?? 0);
      if (connected === 0) expect(result.quality.orphanNodeIds).toContain(nodeId);
    }
  });

  it('keeps every edge endpoint resolvable after fusion rewrote them', () => {
    for (const edge of Object.values(result.graph.edges)) {
      expect(result.graph.nodes[edge.sourceId], `dangling source ${edge.sourceId}`).toBeDefined();
      expect(result.graph.nodes[edge.targetId], `dangling target ${edge.targetId}`).toBeDefined();
    }
  });

  it('re-gates cleanly after fusion — merging introduced no invalid structure', () => {
    const second = runQualityGate(result.graph);
    expect(second.report.rejections).toEqual([]);
  });

  it('keeps the adjacency index consistent with the edge set', () => {
    const counted = Object.values(result.graph.outgoing).reduce((total, list) => total + list.length, 0);
    expect(counted).toBe(Object.keys(result.graph.edges).length);
  });

  it('is byte-identical when built twice', async () => {
    expect(await graphDigest(run(state).graph)).toBe(await graphDigest(result.graph));
  });

  it('collapses the shipped legacy space aliases', () => {
    expect(result.graph.nodes['Space:hall-a']).toBeUndefined();
    expect(result.graph.nodes['Space:room-network']).toBeUndefined();
  });

  it('never auto-merges two nodes of different types', () => {
    for (const record of result.fusion.merges) {
      const survivor = result.graph.nodes[record.survivorId];
      expect(survivor).toBeDefined();
      expect(survivor!.mergedFrom).toContain(record.mergedId);
    }
  });
});

describe('pipeline: shape snapshot', () => {
  it.each(CASES)('%s produces a stable graph shape', (_id, state) => {
    const { graph, quality, fusion } = run(state);
    expect({
      nodesByType: quality.nodesByType,
      edgesByRelation: quality.edgesByRelation,
      orphans: quality.orphanNodeIds.length,
      merges: fusion.merges.map((record) => `${record.mergedId} -> ${record.survivorId}`).sort(),
      reviewQueue: fusion.reviewQueue.length,
      candidateRelations: graph.candidateRelations.map((item) => item.label).sort(),
    }).toMatchSnapshot();
  });
});

describe('pipeline: blocking actually pays for itself', () => {
  it.each(CASES)('%s compares far fewer than all pairs', (_id, state) => {
    const { graph, fusion } = run(state);
    const total = Object.keys(graph.nodes).length;
    expect(fusion.comparisons).toBeLessThan((total * (total - 1)) / 2 / 10);
  });
});

describe('pipeline: an empty build is handled, not crashed', () => {
  const result = run({ ...emptyState(), buildId: 'blank', name: 'Blank' });

  it('still produces the spatial hierarchy and a rating event', () => {
    expect(result.quality.nodesByType.Space).toBeGreaterThan(0);
    expect(result.quality.nodesByType.ScoreEvaluated).toBe(1);
    expect(result.quality.nodesByType.Asset ?? 0).toBe(0);
  });

  it('has a digest that differs from every demo build', async () => {
    const blank = await graphDigest(result.graph);
    for (const [, state] of CASES) expect(await graphDigest(run(state).graph)).not.toBe(blank);
  });
});

describe('pipeline: skipFusion is observably different', () => {
  it('leaves the duplicate spaces in place when fusion is skipped', () => {
    const state = stateOf(DEMO_BUILDS[0]!.snapshot);
    const unfused = buildKnowledgeGraph(state, { now: FIXED_NOW, skipFusion: true });
    expect(unfused.graph.nodes['Space:hall-a']).toBeDefined();
    expect(unfused.fusion.merges).toEqual([]);
    // And the digest differs, which is why fusion must run before any proof.
    expect(digestPreimage(unfused.graph)).not.toBe(digestPreimage(run(state).graph));
  });
});
