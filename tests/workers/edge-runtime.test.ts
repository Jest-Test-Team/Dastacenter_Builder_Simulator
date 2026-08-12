/**
 * Runs inside real workerd, not Node.
 *
 * Why this exists: the graph digest and the whole ZK path depend on WebCrypto
 * (`crypto.subtle.digest`) and on `TextEncoder`. Those exist in Node, in the
 * browser, and in workerd — but with different implementations and different
 * ArrayBuffer semantics. The `utf8()` copy in `digest.ts` was added because of
 * exactly that class of mismatch. A Node-only test suite cannot tell you the
 * edge deployment works; this can.
 *
 * The digest is also the ZK commitment's preimage, so a digest that differs
 * between the browser and the Worker would mean proofs generated client-side
 * could never be verified server-side. That is the property this file pins.
 */

import { describe, expect, it } from 'vitest';
import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';
import {
  buildKnowledgeGraph,
  canonicalize,
  digestPreimage,
  explainScore,
  graphDigest,
  impactOf,
  nodeId,
  serializeSubgraph,
  kHop,
} from '@/lib/kg';
import { CIRCUIT_ID, DEFAULT_THRESHOLD, MockProver, commitmentOf } from '@/lib/zk';

/**
 * The digest this fixture produces under Node, pinned as a literal.
 *
 * This is the single most important assertion in the file. The browser computes
 * the digest, the Worker verifies proofs against it, and a ZK commitment is
 * built on top — so if Node and workerd ever disagree here, client-generated
 * proofs become unverifiable server-side. `tests/integration/kg-digest.test.ts`
 * asserts the same constant from the Node side, so drift in either runtime
 * fails a build.
 */
const NODE_DIGEST = '0xd983e146ffc6dc3e4a36d8749a3347bf470c98745c49d76ed7723d8718edf555';

function build(): BuildState {
  const state: BuildState = { ...emptyState(), buildId: 'edge', name: 'Edge build' };
  const place = (type: string, x: number, z: number, id: string) => {
    const generated = placeBlock(state, { typeId: type, cell: { x, y: 1, z } });
    if (!generated) throw new Error(`could not place ${type}`);
    const instance = state.voxels[generated]!;
    delete state.voxels[generated];
    state.voxels[id] = { ...instance, id };
    for (const [cell, owner] of Object.entries(state.byCell)) if (owner === generated) state.byCell[cell] = id;
  };
  place('utility_feed', 20, 20, 'utility');
  place('transformer', 20, 19, 'xfmr');
  place('switchgear', 20, 18, 'swgr');
  place('ups', 20, 17, 'ups-1');
  place('pdu', 20, 16, 'pdu-1');
  place('server_rack', 20, 15, 'rack-1');
  place('crac', 22, 16, 'crac-1');
  return state;
}

describe('workerd: this really is the edge runtime', () => {
  it('exposes WebCrypto subtle', () => {
    expect(typeof crypto.subtle.digest).toBe('function');
  });

  it('has no DOM, unlike the jsdom suite', () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
  });

  it('provides TextEncoder', () => {
    expect(new TextEncoder().encode('a')).toHaveLength(1);
  });
});

describe('workerd: the knowledge graph pipeline runs at the edge', () => {
  it('builds a graph with no Node-only dependency', () => {
    const { graph, quality } = buildKnowledgeGraph(build(), { now: 1_700_000_000_000 });
    expect(Object.keys(graph.nodes).length).toBeGreaterThan(0);
    expect(quality.rejections).toEqual([]);
    expect(quality.passed).toBe(true);
  });

  it('answers a dependency query', () => {
    const { graph } = buildKnowledgeGraph(build(), { now: 1 });
    const { impacted } = impactOf(graph, nodeId('Asset', 'ups-1'));
    expect(impacted.map((item) => item.nodeId)).toContain(nodeId('Asset', 'rack-1'));
  });

  it('serializes and explains without a DOM', () => {
    const { graph } = buildKnowledgeGraph(build(), { now: 1 });
    const text = serializeSubgraph(graph, kHop(graph, nodeId('Asset', 'ups-1'), 1));
    expect(text).toContain('POWERS');
    expect(explainScore(graph)).toMatch(/Rated \d+\/100/);
  });
});

describe('workerd: the digest is identical to Node', () => {
  it('produces a well-formed SHA-256 through workerd WebCrypto', async () => {
    const { graph } = buildKnowledgeGraph(build(), { now: 1_700_000_000_000 });
    const digest = await graphDigest(graph);
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(digest, 'workerd and Node disagree on the graph digest').toBe(NODE_DIGEST);
  });

  it('is stable across repeated runs in this runtime', async () => {
    const state = build();
    const first = await graphDigest(buildKnowledgeGraph(state, { now: 1 }).graph);
    const second = await graphDigest(buildKnowledgeGraph(state, { now: 999 }).graph);
    expect(first).toBe(second);
  });

  it('hashes the same preimage bytes Node would', () => {
    // The preimage is pure string manipulation; if it differed here, the digest
    // would differ for reasons unrelated to crypto.
    const { graph } = buildKnowledgeGraph(build(), { now: 1 });
    const preimage = digestPreimage(graph);
    expect(preimage.startsWith('kg/v1\n')).toBe(true);
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('survives the SharedArrayBuffer typing workaround in this runtime', async () => {
    // `utf8()` copies into a plain ArrayBuffer before calling subtle.digest.
    // workerd is stricter than Node here, so this is the runtime that proves it.
    const { graph } = buildKnowledgeGraph({ ...emptyState(), buildId: 'x', name: 'x' }, { now: 1 });
    await expect(graphDigest(graph)).resolves.toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('workerd: the ZK path works at the edge', () => {
  const witness = {
    graphDigest: `0x${'ab'.repeat(32)}`,
    score: 92,
    blindingFactor: '0xdeadbeef',
  };

  it('derives commitments with workerd WebCrypto', async () => {
    await expect(commitmentOf(witness, 'rules-v1')).resolves.toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('proves and verifies a threshold claim in-runtime', async () => {
    const prover = new MockProver();
    const proof = await prover.prove({
      witness,
      threshold: DEFAULT_THRESHOLD,
      rulePackVersion: 'rules-v1',
    });
    expect(proof.statement.circuit).toBe(CIRCUIT_ID);
    expect(await prover.verify(proof)).toEqual({ valid: true });
  });

  it('refuses a below-threshold witness at the edge too', async () => {
    const prover = new MockProver();
    await expect(
      prover.prove({
        witness: { ...witness, score: 10 },
        threshold: DEFAULT_THRESHOLD,
        rulePackVersion: 'rules-v1',
      }),
    ).rejects.toThrow(/below the threshold/);
  });
});
