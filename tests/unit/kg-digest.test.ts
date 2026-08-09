import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/blocks';
import { buildKnowledgeGraph, canonicalize, digestPreimage, graphDigest, sha256Hex } from '@/lib/kg';
import { FIXED_NOW, buildWith, powerChainBuild, withFabric } from './kg-fixtures';

const graphOf = (state = withFabric(powerChainBuild())) =>
  buildKnowledgeGraph(state, { now: FIXED_NOW }).graph;

describe('digest: canonicalize', () => {
  it('sorts object keys so encoding order cannot change the result', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('preserves array order, which is meaningful', () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it('drops undefined values and normalises non-finite numbers', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalize(Number.NaN)).toBe('null');
    expect(canonicalize(Infinity)).toBe('null');
  });

  it('handles nesting and null', () => {
    expect(canonicalize({ a: { c: [1, { e: null }], b: 'x' } })).toBe('{"a":{"b":"x","c":[1,{"e":null}]}}');
  });
});

describe('digest: determinism', () => {
  it('is identical for two graphs built from the same state', async () => {
    const state = withFabric(powerChainBuild());
    expect(await graphDigest(graphOf(state))).toBe(await graphDigest(graphOf(state)));
  });

  it('is independent of the extraction clock', async () => {
    const state = withFabric(powerChainBuild());
    const early = buildKnowledgeGraph(state, { now: 1 }).graph;
    const late = buildKnowledgeGraph(state, { now: 9_999_999 }).graph;
    expect(await graphDigest(early)).toBe(await graphDigest(late));
  });

  it('is independent of node and edge insertion order', async () => {
    const graph = graphOf();
    const reversed = {
      ...graph,
      nodes: Object.fromEntries(Object.entries(graph.nodes).reverse()),
      edges: Object.fromEntries(Object.entries(graph.edges).reverse()),
    };
    expect(await graphDigest(reversed)).toBe(await graphDigest(graph));
  });

  it('produces a 0x-prefixed 32-byte hex string', async () => {
    expect(await graphDigest(graphOf())).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('digest: sensitivity', () => {
  it('changes when a block is added', async () => {
    const before = await graphDigest(graphOf(powerChainBuild()));
    const after = await graphDigest(
      graphOf(
        buildWith([
          { type: 'utility_feed', at: { x: 20, y: 1, z: 20 } },
          { type: 'transformer', at: { x: 20, y: 1, z: 19 } },
          { type: 'switchgear', at: { x: 20, y: 1, z: 18 } },
          { type: 'ups', at: { x: 20, y: 1, z: 17 } },
          { type: 'pdu', at: { x: 20, y: 1, z: 16 } },
          { type: 'server_rack', at: { x: 20, y: 1, z: 15 } },
          { type: 'server_rack', at: { x: 21, y: 1, z: 15 } },
          { type: 'crac', at: { x: 22, y: 1, z: 16 } },
          { type: 'server_rack', at: { x: 22, y: 1, z: 15 } },
        ]),
      ),
    );
    expect(after).not.toBe(before);
  });

  it('changes when a policy toggle flips', async () => {
    const off = powerChainBuild();
    const on = structuredClone(off);
    on.policies['privacy.encryption_at_rest'] = true;
    expect(await graphDigest(graphOf(on))).not.toBe(await graphDigest(graphOf(off)));
  });

  it('changes when an edge attribute changes', async () => {
    const graph = graphOf();
    const tampered = structuredClone(graph);
    const first = Object.values(tampered.edges)[0]!;
    tampered.edges[first.id] = { ...first, attributes: { ...first.attributes, tampered: true } };
    expect(await graphDigest(tampered)).not.toBe(await graphDigest(graph));
  });

  it('distinguishes an empty build from a populated one', async () => {
    const empty = await graphDigest(graphOf({ ...emptyState(), buildId: 'test', name: 'Test build' }));
    expect(empty).not.toBe(await graphDigest(graphOf()));
  });
});

describe('digest: preimage', () => {
  it('is reconstructible by a verifier and carries a version tag', () => {
    const preimage = digestPreimage(graphOf());
    expect(preimage.startsWith('kg/v1\n')).toBe(true);
    expect(preimage).toContain('nodes:');
    expect(preimage).toContain('edges:');
  });

  it('excludes extraction timestamps, which say nothing about the design', () => {
    expect(digestPreimage(graphOf())).not.toContain(String(FIXED_NOW));
  });

  it('hashes to the same value as graphDigest', async () => {
    const graph = graphOf();
    expect(await sha256Hex(digestPreimage(graph))).toBe(await graphDigest(graph));
  });
});
