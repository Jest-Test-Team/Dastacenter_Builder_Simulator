import { describe, expect, it } from 'vitest';
import {
  MAX_HOPS,
  buildKnowledgeGraph,
  describeNode,
  explainConnection,
  explainImpact,
  explainScore,
  findPath,
  impactOf,
  kHop,
  nodeId,
  search,
  serializeSubgraph,
  type KnowledgeGraph,
} from '@/lib/kg';
import { FIXED_NOW, instanceId, powerChainBuild, withFabric } from './kg-fixtures';

const asset = (type: string, index = 0) => nodeId('Asset', instanceId(type, index));

function fixture(): KnowledgeGraph {
  return buildKnowledgeGraph(withFabric(powerChainBuild()), { now: FIXED_NOW }).graph;
}

describe('serve: kHop', () => {
  const graph = fixture();

  it('returns the start node alone at k=0', () => {
    const result = kHop(graph, asset('ups'), 0);
    expect(result.nodes.map((node) => node.id)).toEqual([asset('ups')]);
    expect(result.edges).toEqual([]);
  });

  it('grows with k', () => {
    const one = kHop(graph, asset('ups'), 1);
    const two = kHop(graph, asset('ups'), 2);
    expect(two.nodes.length).toBeGreaterThan(one.nodes.length);
  });

  it('caps at MAX_HOPS, because beyond two hops a neighbourhood is noise', () => {
    const capped = kHop(graph, asset('ups'), MAX_HOPS);
    const beyond = kHop(graph, asset('ups'), MAX_HOPS + 5);
    expect(beyond.nodes.map((node) => node.id)).toEqual(capped.nodes.map((node) => node.id));
  });

  it('returns nothing for an unknown node', () => {
    expect(kHop(graph, 'Asset:nope', 2)).toEqual({ nodes: [], edges: [] });
  });

  it('traverses in both directions', () => {
    // The rack has no outgoing POWERS edge; it is only ever a target.
    const result = kHop(graph, asset('server_rack'), 1);
    expect(result.nodes.map((node) => node.id)).toContain(asset('pdu'));
  });
});

describe('serve: findPath', () => {
  const graph = fixture();

  it('finds the power chain from utility feed to rack', () => {
    const path = findPath(graph, asset('utility_feed'), asset('server_rack'), { relations: ['POWERS'] });
    expect(path).not.toBeNull();
    expect(path!.nodeIds).toEqual([
      asset('utility_feed'),
      asset('transformer'),
      asset('switchgear'),
      asset('ups'),
      asset('pdu'),
      asset('server_rack'),
    ]);
    expect(new Set(path!.relations)).toEqual(new Set(['POWERS']));
  });

  it('returns a zero-length path for a node to itself', () => {
    const path = findPath(graph, asset('ups'), asset('ups'));
    expect(path).toEqual({ nodeIds: [asset('ups')], edgeIds: [], relations: [] });
  });

  it('returns null when the relation filter disconnects the endpoints', () => {
    expect(findPath(graph, asset('utility_feed'), asset('server_rack'), { relations: ['COOLS'] })).toBeNull();
  });

  it('routes around an excluded node', () => {
    const blocked = findPath(graph, asset('utility_feed'), asset('server_rack'), {
      relations: ['POWERS'],
      excludeNodeIds: new Set([asset('ups')]),
    });
    expect(blocked).toBeNull(); // this chain is strictly serial — no N+1 UPS
  });

  it('returns null for unknown endpoints', () => {
    expect(findPath(graph, 'Asset:nope', asset('ups'))).toBeNull();
  });
});

describe('serve: impactOf', () => {
  const graph = fixture();

  it('names the racks that lose power when the UPS fails', () => {
    const { impacted, byType } = impactOf(graph, asset('ups'));
    const ids = impacted.map((item) => item.nodeId);
    expect(ids).toContain(asset('pdu'));
    expect(ids).toContain(asset('server_rack', 0));
    expect(ids).toContain(asset('server_rack', 1));
    expect(byType.Asset).toBeDefined();
  });

  it('orders by distance, with the directly-fed node first', () => {
    const { impacted } = impactOf(graph, asset('ups'));
    expect(impacted[0]!.nodeId).toBe(asset('pdu'));
    expect(impacted[0]!.distance).toBe(1);
    expect(impacted.find((item) => item.nodeId === asset('server_rack', 0))!.distance).toBe(2);
  });

  it('propagates only along dependency relations — adjacency is not failure', () => {
    const { impacted } = impactOf(graph, asset('ups'));
    expect(impacted.every((item) => ['POWERS', 'COOLS', 'REALIZED_BY'].includes(item.via))).toBe(true);
  });

  it('reports nothing for a terminal consumer', () => {
    expect(impactOf(graph, asset('server_rack')).impacted).toEqual([]);
  });

  it('reports nothing for an unknown node', () => {
    expect(impactOf(graph, 'Asset:nope').impacted).toEqual([]);
  });

  it('terminates on a cycle rather than looping forever', () => {
    const cyclic = structuredClone(fixture());
    const a = asset('ups');
    const b = asset('pdu');
    cyclic.edges[`${b}|POWERS|${a}`] = {
      id: `${b}|POWERS|${a}`,
      relation: 'POWERS',
      sourceId: b,
      targetId: a,
      attributes: {},
      provenance: { extractor: 'test', source: 'test', extractedAt: FIXED_NOW, confidence: 'low' },
    };
    cyclic.outgoing[b] = [...(cyclic.outgoing[b] ?? []), `${b}|POWERS|${a}`];
    expect(() => impactOf(cyclic, a)).not.toThrow();
  });
});

describe('serve: search', () => {
  const graph = fixture();

  it('matches on name, id and alias, case-insensitively', () => {
    expect(search(graph, 'ups').length).toBeGreaterThan(0);
    expect(search(graph, 'UPS').length).toBeGreaterThan(0);
  });

  it('filters by type', () => {
    const spaces = search(graph, '', 'Space');
    expect(spaces.length).toBeGreaterThan(0);
    expect(spaces.every((node) => node.type === 'Space')).toBe(true);
  });
});

describe('serve: serializeSubgraph', () => {
  const graph = fixture();

  it('groups triples by head and includes provenance by default', () => {
    const text = serializeSubgraph(graph, kHop(graph, asset('ups'), 1));
    expect(text).toContain('(Asset:UPS)');
    expect(text).toMatch(/-\[POWERS \{source: [^}]+, confidence: \w+\}\]-> /);
  });

  it('omits provenance on request', () => {
    const text = serializeSubgraph(graph, kHop(graph, asset('ups'), 1), { provenance: false });
    expect(text).toContain('-[POWERS]->');
    expect(text).not.toContain('source:');
  });

  it('is deduplicated and stable across runs', () => {
    const once = serializeSubgraph(graph, kHop(graph, asset('ups'), 2));
    const twice = serializeSubgraph(graph, kHop(graph, asset('ups'), 2));
    expect(once).toBe(twice);

    // Deduplication is per head. The same triple line under two different heads
    // is not a duplicate — it is two distinct facts that happen to read alike.
    let head = '';
    const seen = new Map<string, Set<string>>();
    for (const line of once.split('\n')) {
      if (!line.startsWith('  ')) {
        head = line;
        expect(seen.has(head), `head ${head} emitted twice`).toBe(false);
        seen.set(head, new Set());
        continue;
      }
      const body = seen.get(head)!;
      expect(body.has(line), `duplicate line under ${head}`).toBe(false);
      body.add(line);
    }
  });

  it('disambiguates two nodes of the same type sharing a name', () => {
    const text = serializeSubgraph(graph, kHop(graph, asset('pdu'), 1), { provenance: false });
    expect(text).toContain('Asset:Server Rack#server_rack-0');
    expect(text).toContain('Asset:Server Rack#server_rack-1');
  });

  it('caps output so a context window cannot be blown', () => {
    const everything = { nodes: Object.values(graph.nodes), edges: Object.values(graph.edges) };
    const text = serializeSubgraph(graph, everything, { maxLines: 10 });
    expect(text.split('\n')).toHaveLength(11);
    expect(text).toContain('more lines omitted');
  });
});

describe('explain', () => {
  const graph = fixture();

  it('renders a path as a sentence', () => {
    const path = findPath(graph, asset('ups'), asset('server_rack'), { relations: ['POWERS'] })!;
    const sentence = explainConnection(graph, asset('ups'), asset('server_rack'), ['POWERS']);
    expect(path).not.toBeNull();
    expect(sentence).toContain('UPS');
    expect(sentence).toContain('powers');
    expect(sentence.endsWith('.')).toBe(true);
  });

  it('says so plainly when two nodes are unconnected', () => {
    const isolated = structuredClone(graph);
    isolated.nodes['Asset:orphan'] = {
      id: 'Asset:orphan',
      type: 'Asset',
      name: 'Orphan',
      aliases: [],
      attributes: {},
      provenance: { extractor: 'test', source: 'test', extractedAt: FIXED_NOW, confidence: 'high' },
    };
    expect(explainConnection(isolated, asset('ups'), 'Asset:orphan')).toContain('not connected');
  });

  it('summarises impact with counts and examples', () => {
    const text = explainImpact(graph, asset('ups'));
    expect(text).toMatch(/impairs \d+ nodes?/);
    expect(text).toContain('powers');
  });

  it('states plainly when nothing depends on a node', () => {
    expect(explainImpact(graph, asset('server_rack'))).toContain('impacts no other asset');
  });

  it('explains the score by naming the assets behind the issues', () => {
    const text = explainScore(graph);
    expect(text).toMatch(/Rated \d+\/100/);
    expect(text).toContain('rule pack');
  });

  it('describes a node and its immediate surroundings', () => {
    const text = describeNode(graph, asset('ups'));
    expect(text).toContain('UPS is a Asset');
    expect(describeNode(graph, 'Asset:nope')).toBe('Unknown node.');
  });
});
