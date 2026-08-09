import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/blocks';
import {
  AUTO_MERGE_THRESHOLD,
  REVIEW_THRESHOLD,
  blockingKeys,
  buildKnowledgeGraph,
  edgeId,
  fuseGraph,
  indexGraph,
  matchScore,
  nodeId,
  normalizeName,
  unmerge,
  type GraphEdge,
  type GraphNode,
  type KnowledgeGraph,
  type NodeType,
  type RelationType,
} from '@/lib/kg';
import { FIXED_NOW, powerChainBuild, withFabric } from './kg-fixtures';

function node(id: string, type: NodeType, name: string, attributes: Record<string, unknown> = {}): GraphNode {
  return {
    id,
    type,
    name,
    aliases: [],
    attributes,
    provenance: { extractor: 'test', source: `test/${id}`, extractedAt: FIXED_NOW, confidence: 'high' },
  };
}

function edge(relation: RelationType, sourceId: string, targetId: string): GraphEdge {
  return {
    id: edgeId(relation, sourceId, targetId),
    relation,
    sourceId,
    targetId,
    attributes: {},
    provenance: { extractor: 'test', source: 'test/edge', extractedAt: FIXED_NOW, confidence: 'high' },
  };
}

function graphOf(nodes: GraphNode[], edges: GraphEdge[]): KnowledgeGraph {
  return indexGraph({
    rootId: 'Build:x',
    nodes: Object.fromEntries(nodes.map((item) => [item.id, item])),
    edges: Object.fromEntries(edges.map((item) => [item.id, item])),
    outgoing: {},
    incoming: {},
    candidateRelations: [],
  });
}

const bounds = (x: number) => ({ x, y: 0, z: 15, width: 28, height: 3, depth: 14 });

describe('fuse: normalization and blocking', () => {
  it('strips parentheticals and punctuation from names', () => {
    expect(normalizeName('Data Hall A (legacy)')).toBe('data hall a');
    expect(normalizeName('  Main-Floor  ')).toBe('main floor');
  });

  it('blocks spaces by kind and level so unlike things are never compared', () => {
    const keys = blockingKeys(node('a', 'Space', 'Data Hall A', { kind: 'hall', floorLevel: 0 }));
    expect(keys).toContain('Space|hall|0');
  });

  it('reduces comparisons far below the all-pairs count', () => {
    const { graph } = buildKnowledgeGraph(withFabric(powerChainBuild()), { now: FIXED_NOW });
    const { report } = fuseGraph(graph);
    const total = Object.keys(graph.nodes).length;
    const allPairs = (total * (total - 1)) / 2;
    expect(report.comparisons).toBeLessThan(allPairs / 4);
  });
});

describe('fuse: the structure layer', () => {
  it('separates identically-named nodes with disjoint neighbourhoods', () => {
    const graph = graphOf(
      [
        node('Space:west-1', 'Space', 'Operations West', { kind: 'room', floorLevel: 1, bounds: bounds(2) }),
        node('Space:west-2', 'Space', 'Operations West', { kind: 'room', floorLevel: 2, bounds: bounds(9) }),
        node('Space:floor-1', 'Space', 'Floor 1', { kind: 'floor', floorLevel: 1 }),
        node('Space:floor-2', 'Space', 'Floor 2', { kind: 'floor', floorLevel: 2 }),
      ],
      [edge('CONTAINS', 'Space:floor-1', 'Space:west-1'), edge('CONTAINS', 'Space:floor-2', 'Space:west-2')],
    );
    const score = matchScore(graph, graph.nodes['Space:west-1']!, graph.nodes['Space:west-2']!);
    expect(score.string).toBe(1); // names agree exactly
    expect(score.structure).toBe(0); // but they live under different floors
    expect(score.total).toBeLessThan(AUTO_MERGE_THRESHOLD);
    expect(fuseGraph(graph).report.merges).toEqual([]);
  });

  it('merges same-named nodes that share bounds and a neighbourhood', () => {
    const graph = graphOf(
      [
        node('Space:hall', 'Space', 'Data Hall A', { kind: 'hall', floorLevel: 0, bounds: bounds(2), visible: true }),
        node('Space:hall-legacy', 'Space', 'Data Hall A (legacy)', {
          kind: 'hall',
          floorLevel: 0,
          bounds: bounds(2),
          visible: false,
        }),
        node('Space:floor', 'Space', 'Main Floor', { kind: 'floor', floorLevel: 0 }),
      ],
      [edge('CONTAINS', 'Space:floor', 'Space:hall'), edge('CONTAINS', 'Space:floor', 'Space:hall-legacy')],
    );
    const { graph: fused, report } = fuseGraph(graph);
    expect(report.merges).toHaveLength(1);
    // The visible node survives; the hidden legacy copy is absorbed.
    expect(report.merges[0]!.survivorId).toBe('Space:hall');
    expect(fused.nodes['Space:hall-legacy']).toBeUndefined();
    expect(fused.nodes['Space:hall']!.aliases).toContain('Data Hall A (legacy)');
    expect(fused.nodes['Space:hall']!.mergedFrom).toEqual(['Space:hall-legacy']);
  });
});

describe('fuse: merge policy', () => {
  const build = () =>
    graphOf(
      [
        node('Space:a', 'Space', 'Hall', { kind: 'hall', floorLevel: 0, bounds: bounds(2), visible: true, note: 'left' }),
        node('Space:b', 'Space', 'Hall', { kind: 'hall', floorLevel: 0, bounds: bounds(2), visible: false, note: 'right' }),
        node('Asset:r1', 'Asset', 'Rack 1'),
        node('Asset:r2', 'Asset', 'Rack 2'),
      ],
      [edge('LOCATED_IN', 'Asset:r1', 'Space:a'), edge('LOCATED_IN', 'Asset:r2', 'Space:b')],
    );

  it('rewrites the absorbed node’s edges onto the survivor', () => {
    const { graph } = fuseGraph(build());
    expect(graph.edges[edgeId('LOCATED_IN', 'Asset:r2', 'Space:a')]).toBeDefined();
    expect(graph.edges[edgeId('LOCATED_IN', 'Asset:r2', 'Space:b')]).toBeUndefined();
  });

  it('keeps conflicting attribute values with provenance instead of overwriting', () => {
    const { graph } = fuseGraph(build());
    const survivor = graph.nodes['Space:a']!;
    expect(survivor.attributes.note).toBe('left');
    expect(survivor.conflicts?.note?.[0]?.value).toBe('right');
    expect(survivor.conflicts?.note?.[0]?.provenance.source).toBe('test/Space:b');
  });

  it('queues the ambiguous middle band for review rather than guessing', () => {
    const graph = graphOf(
      [
        node('Space:a', 'Space', 'Operations West', { kind: 'room', floorLevel: 1, bounds: bounds(2) }),
        node('Space:b', 'Space', 'Operations West', { kind: 'room', floorLevel: 1, bounds: bounds(9) }),
        node('Space:floor', 'Space', 'Floor 1', { kind: 'floor', floorLevel: 1 }),
      ],
      [edge('CONTAINS', 'Space:floor', 'Space:a'), edge('CONTAINS', 'Space:floor', 'Space:b')],
    );
    const { report } = fuseGraph(graph);
    expect(report.merges).toEqual([]);
    expect(report.reviewQueue).toHaveLength(1);
    expect(report.reviewQueue[0]!.score.total).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
    expect(report.reviewQueue[0]!.reason).toContain('names agree');
  });
});

describe('fuse: merges are reversible', () => {
  it('unmerge restores the graph exactly', () => {
    const before = fuseGraph(
      graphOf(
        [
          node('Space:a', 'Space', 'Hall', { kind: 'hall', floorLevel: 0, bounds: bounds(2), visible: true }),
          node('Space:b', 'Space', 'Hall', { kind: 'hall', floorLevel: 0, bounds: bounds(2), visible: false }),
          node('Asset:r1', 'Asset', 'Rack 1'),
        ],
        [edge('LOCATED_IN', 'Asset:r1', 'Space:b')],
      ),
    );
    expect(before.report.merges).toHaveLength(1);

    const restored = unmerge(before.graph, before.report.merges[0]!);
    expect(Object.keys(restored.nodes).sort()).toEqual(['Asset:r1', 'Space:a', 'Space:b']);
    expect(restored.edges[edgeId('LOCATED_IN', 'Asset:r1', 'Space:b')]).toBeDefined();
    expect(restored.edges[edgeId('LOCATED_IN', 'Asset:r1', 'Space:a')]).toBeUndefined();
    expect(restored.nodes['Space:a']!.mergedFrom).toBeUndefined();
    expect(restored.nodes['Space:a']!.aliases).toEqual([]);
  });
});

describe('fuse: the legacy alias duplication in the default hierarchy', () => {
  it('collapses hall-a onto main-floor-hall, which the visibility flag only hid', () => {
    const state = { ...emptyState(), buildId: 'legacy-check' };
    const spaces = state.network!.spaces;
    // Precondition: the shipped default really does contain the duplicate.
    expect(spaces['hall-a']!.bounds).toEqual(spaces['main-floor-hall']!.bounds);
    expect(spaces['hall-a']!.visible).toBe(false);

    const { graph, fusion } = buildKnowledgeGraph(state, { now: FIXED_NOW });
    const merged = fusion.merges.map((record) => record.mergedId);
    expect(merged).toContain(nodeId('Space', 'hall-a'));
    expect(merged).toContain(nodeId('Space', 'room-network'));
    expect(graph.nodes[nodeId('Space', 'hall-a')]).toBeUndefined();
    expect(graph.nodes[nodeId('Space', 'main-floor-hall')]!.aliases).toContain('Data Hall A (legacy)');
  });
});
