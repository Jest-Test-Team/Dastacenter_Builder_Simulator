import { describe, expect, it } from 'vitest';
import {
  PRECISION_THRESHOLD,
  buildKnowledgeGraph,
  edgeId,
  indexGraph,
  runQualityGate,
  type GraphEdge,
  type GraphNode,
  type KnowledgeGraph,
  type NodeType,
  type RelationType,
} from '@/lib/kg';
import { FIXED_NOW, powerChainBuild, withFabric } from './kg-fixtures';

function node(id: string, type: NodeType, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    type,
    name: id,
    aliases: [],
    attributes: {},
    provenance: { extractor: 'test', source: `test/${id}`, extractedAt: FIXED_NOW, confidence: 'high' },
    ...overrides,
  };
}

function edge(relation: RelationType, sourceId: string, targetId: string, overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    id: edgeId(relation, sourceId, targetId),
    relation,
    sourceId,
    targetId,
    attributes: {},
    provenance: { extractor: 'test', source: 'test/edge', extractedAt: FIXED_NOW, confidence: 'high' },
    ...overrides,
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

describe('gate: type validation', () => {
  it('accepts an edge whose endpoints match the ontology', () => {
    const { report } = runQualityGate(
      graphOf([node('a', 'Asset'), node('s', 'Space')], [edge('LOCATED_IN', 'a', 's')]),
    );
    expect(report.rejections).toEqual([]);
    expect(report.edgeCount).toBe(1);
  });

  it('rejects a domain violation instead of repairing it', () => {
    const { graph, report } = runQualityGate(
      graphOf([node('s1', 'Space'), node('s2', 'Space')], [edge('LOCATED_IN', 's1', 's2')]),
    );
    expect(report.rejections).toHaveLength(1);
    expect(report.rejections[0]!.reason).toMatch(/requires domain Asset/);
    expect(Object.keys(graph.edges)).toHaveLength(0);
  });

  it('rejects a range violation', () => {
    const { report } = runQualityGate(
      graphOf([node('a', 'Asset'), node('t', 'AssetType')], [edge('LOCATED_IN', 'a', 't')]),
    );
    expect(report.rejections[0]!.reason).toMatch(/requires range Space/);
  });

  it('rejects an edge with a dangling endpoint', () => {
    const { report } = runQualityGate(graphOf([node('a', 'Asset')], [edge('LOCATED_IN', 'a', 'missing')]));
    expect(report.rejections[0]!.reason).toMatch(/dangling endpoint \(missing\)/);
  });

  it('rejects a self-loop on a non-symmetric relation', () => {
    const { report } = runQualityGate(graphOf([node('a', 'Asset')], [edge('POWERS', 'a', 'a')]));
    expect(report.rejections[0]!.reason).toBe('self-loop');
  });
});

describe('gate: provenance is non-negotiable', () => {
  it('drops a node with no provenance', () => {
    const bad = node('a', 'Asset');
    // @ts-expect-error deliberately malformed input
    bad.provenance = undefined;
    const { report } = runQualityGate(graphOf([bad], []));
    expect(report.rejections).toEqual([{ kind: 'node', id: 'a', reason: 'missing provenance' }]);
  });

  it('drops an edge with no provenance source', () => {
    const bad = edge('LOCATED_IN', 'a', 's');
    bad.provenance = { ...bad.provenance, source: '' };
    const { report } = runQualityGate(graphOf([node('a', 'Asset'), node('s', 'Space')], [bad]));
    expect(report.rejections[0]!.reason).toBe('missing provenance');
  });

  it('drops a node with an undeclared type', () => {
    const { report } = runQualityGate(graphOf([node('x', 'Widget' as NodeType)], []));
    expect(report.rejections[0]!.reason).toMatch(/unknown node type/);
  });
});

describe('gate: symmetric relations', () => {
  it('materializes the reverse direction exactly once', () => {
    const { graph, report } = runQualityGate(
      graphOf([node('a', 'Asset'), node('b', 'Asset')], [edge('ADJACENT_TO', 'a', 'b')]),
    );
    expect(report.materializedEdges).toBe(1);
    expect(graph.edges[edgeId('ADJACENT_TO', 'b', 'a')]).toBeDefined();
    expect(graph.edges[edgeId('ADJACENT_TO', 'b', 'a')]!.provenance.derivedFrom).toMatch(/^mirror of/);
  });

  it('does not revive a rejected edge as a mirror', () => {
    const { graph } = runQualityGate(graphOf([node('a', 'Asset')], [edge('ADJACENT_TO', 'a', 'gone')]));
    expect(Object.keys(graph.edges)).toHaveLength(0);
  });
});

describe('gate: report', () => {
  it('reports orphans without dropping them', () => {
    const { graph, report } = runQualityGate(graphOf([node('lonely', 'Asset')], []));
    expect(report.orphanNodeIds).toEqual(['lonely']);
    expect(graph.nodes.lonely).toBeDefined();
  });

  it('computes precision as the share of proposed facts that survived', () => {
    const { report } = runQualityGate(
      graphOf(
        [node('a', 'Asset'), node('s', 'Space')],
        [edge('LOCATED_IN', 'a', 's'), edge('LOCATED_IN', 's', 'a')],
      ),
    );
    expect(report.precision).toBeCloseTo(3 / 4);
    expect(report.passed).toBe(false);
  });

  it('treats an empty graph as vacuously clean', () => {
    const { report } = runQualityGate(graphOf([], []));
    expect(report.precision).toBe(1);
    expect(report.passed).toBe(true);
  });
});

describe('gate: real builds clear the precision floor', () => {
  it('rejects nothing from a complete build', () => {
    const { quality } = buildKnowledgeGraph(withFabric(powerChainBuild()), { now: FIXED_NOW });
    expect(quality.rejections).toEqual([]);
    expect(quality.precision).toBe(1);
    expect(quality.precision).toBeGreaterThanOrEqual(PRECISION_THRESHOLD);
    expect(quality.passed).toBe(true);
  });

  it('populates every plane the pipeline expects', () => {
    const { quality } = buildKnowledgeGraph(withFabric(powerChainBuild()), { now: FIXED_NOW });
    for (const type of ['Build', 'Space', 'Asset', 'AssetType', 'Standard', 'NetworkDevice', 'Link'])
      expect(quality.nodesByType[type], `${type} plane is empty`).toBeGreaterThan(0);
    for (const relation of ['CONTAINS', 'LOCATED_IN', 'INSTANCE_OF', 'POWERS', 'COOLS', 'TERMINATES'])
      expect(quality.edgesByRelation[relation], `${relation} missing`).toBeGreaterThan(0);
  });
});
