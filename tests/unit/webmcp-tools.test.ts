/**
 * The WebMCP tool catalog's contract.
 *
 * Two claims are load-bearing and both are asserted here.
 *
 * The first is the manifest's: a tool an agent cannot understand is a tool that
 * does not work, so names, descriptions and input schemas have to be present,
 * unique and stable. A renamed tool silently breaks every saved agent workflow,
 * which is why the name set is pinned rather than merely counted.
 *
 * The second is the disclosure claim, and it is tested the way
 * `ai-disclosure.test.ts` tests its own: against the *serialized* payload. A
 * coordinate nested two levels down inside an instance record would pass a
 * shallow key check and still be sitting in the agent's transcript. Serializing
 * is what a network tab would show, so that is what gets searched — including
 * for the literal cell-key format, because `byCell`'s keys are coordinates even
 * when the word "position" appears nowhere.
 */

import { describe, expect, it } from 'vitest';
import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';
import {
  WEBMCP_MANIFEST_VERSION,
  WEBMCP_TOOLS,
  projectCatalog,
  projectFailingRules,
  projectScore,
  projectSnapshot,
  toJsonSchema,
  toolManifest,
} from '@/lib/webmcp/tools';
import { z } from 'zod';

/** Coordinates chosen to be recognisable if they ever escape into a payload. */
const FIXTURE_CELLS = [
  ['floor_tile', { x: 3, y: 0, z: 7 }],
  ['ups', { x: 5, y: 0, z: 11 }],
  ['generator', { x: 9, y: 0, z: 2 }],
  ['cctv_camera', { x: 12, y: 0, z: 15 }],
] as const;

function fixture(): BuildState {
  const state = emptyState();
  for (const [typeId, cell] of FIXTURE_CELLS) {
    // A fixture whose blocks silently failed to place would make every
    // "does not leak" assertion below vacuously true.
    expect(placeBlock(state, { typeId, cell })).not.toBeNull();
  }
  return state;
}

describe('webmcp manifest', () => {
  const manifest = toolManifest();

  it('declares the webmcp protocol and a pinned version', () => {
    expect(manifest.protocol).toBe('webmcp');
    expect(manifest.version).toBe(WEBMCP_MANIFEST_VERSION);
  });

  it('exposes the stable tool set', () => {
    // Pinned, not counted: a rename is a breaking change for every agent that
    // learned this page, and should fail here rather than in someone's session.
    expect(manifest.tools.map((t) => t.name).sort()).toEqual([
      'explain_failing_rules',
      'get_build_snapshot',
      'list_block_types',
      'place_block',
      'remove_block',
      'score_build',
    ]);
  });

  it('gives every tool a usable name, description and input schema', () => {
    for (const tool of manifest.tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.trim().length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeTypeOf('object');
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('states the disclosure contract once, copied from the gate itself', () => {
    // Stated in the manifest rather than repeated in every tool result: a judge
    // reading the JSON can see what is withheld without running the app.
    expect(manifest.disclosure.defaultFields).toEqual(
      expect.arrayContaining(['axisScores', 'failingRuleIds', 'blockCountsByCategory']),
    );
    expect(manifest.disclosure.optionalFields).toEqual(
      expect.arrayContaining(['tier', 'pue', 'overallScore']),
    );
    expect(manifest.disclosure.neverDisclosed.join(' ').toLowerCase()).toContain('coordinates');
  });

  it('has unique tool names', () => {
    const names = manifest.tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('describes every input property, so an agent can fill them in blind', () => {
    for (const tool of manifest.tools) {
      for (const property of Object.values(tool.inputSchema.properties ?? {})) {
        expect(property.description ?? '').not.toBe('');
      }
    }
  });
});

describe('toJsonSchema', () => {
  it('marks optional properties as not required', () => {
    const schema = toJsonSchema(z.object({ a: z.string(), b: z.number().optional() }));
    expect(schema.required).toEqual(['a']);
  });

  it('distinguishes integers from numbers', () => {
    expect(toJsonSchema(z.number().int()).type).toBe('integer');
    expect(toJsonSchema(z.number()).type).toBe('number');
  });

  it('renders a union of literals as an enum', () => {
    const schema = toJsonSchema(z.union([z.literal(0), z.literal(1)]));
    expect(schema).toMatchObject({ type: 'number', enum: [0, 1] });
  });

  it('carries zod descriptions through to the schema', () => {
    expect(toJsonSchema(z.string().describe('a thing')).description).toBe('a thing');
  });
});

describe('catalog projection', () => {
  it('lists blocks with the fields an agent needs to choose one', () => {
    const blocks = projectCatalog();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.id).not.toBe('');
      expect(block.displayName).not.toBe('');
      expect(block.size).toHaveLength(3);
    }
  });

  it('filters by category', () => {
    const power = projectCatalog('power');
    expect(power.length).toBeGreaterThan(0);
    expect(power.every((b) => b.category === 'power')).toBe(true);
  });
});

describe('the disclosure boundary', () => {
  /**
   * Every read projection, serialized. If a coordinate can reach an agent, it
   * reaches it through one of these three.
   */
  function readPayloads(state: BuildState): Record<string, string> {
    return {
      snapshot: JSON.stringify(projectSnapshot(state)),
      // The widest possible ask: every optional disclosure field switched on.
      score: JSON.stringify(projectScore(state, ['tier', 'pue', 'overallScore'])),
      failingRules: JSON.stringify(projectFailingRules(state)),
    };
  }

  it('never emits a coordinate field name', () => {
    for (const [label, payload] of Object.entries(readPayloads(fixture()))) {
      for (const forbidden of ['"position"', '"byCell"', '"voxels"', '"cell"', '"camera"']) {
        expect(payload, `${label} leaked ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('never emits a cell key, which is a coordinate under another name', () => {
    for (const [label, payload] of Object.entries(readPayloads(fixture()))) {
      expect(payload, `${label} leaked a cell key`).not.toMatch(/-?\d+,-?\d+,-?\d+/);
    }
  });

  it('never emits the ZK commitment preimage or session identity', () => {
    for (const [label, payload] of Object.entries(readPayloads(fixture()))) {
      for (const forbidden of ['blinding', 'digest', 'walletAddress', 'shareToken']) {
        expect(payload.toLowerCase(), `${label} leaked ${forbidden}`).not.toContain(
          forbidden.toLowerCase(),
        );
      }
    }
  });

  it('withholds tier, pue and the exact score unless they are asked for', () => {
    const snapshot = projectSnapshot(fixture());
    expect(snapshot.disclosed.tier).toBeUndefined();
    expect(snapshot.disclosed.pue).toBeUndefined();
    expect(snapshot.disclosed.overallScore).toBeUndefined();
    expect(snapshot.disclosureLedger.withheld).toEqual(
      expect.arrayContaining(['tier', 'pue', 'overallScore']),
    );
  });

  it('releases them only on an explicit include, and says so in the ledger', () => {
    const scored = projectScore(fixture(), ['tier', 'pue', 'overallScore']);
    expect(scored.disclosed.tier).toBeTypeOf('string');
    expect(scored.disclosed.pue).toBeTypeOf('number');
    expect(scored.disclosed.overallScore).toBeTypeOf('number');
    expect(scored.disclosureLedger.disclosed).toEqual(
      expect.arrayContaining(['tier', 'pue', 'overallScore']),
    );
  });

  it('still reports counts and instance ids, which are the allowlisted handles', () => {
    const snapshot = projectSnapshot(fixture());
    expect(snapshot.blockCount).toBe(FIXTURE_CELLS.length);
    expect(snapshot.blockCountsByType.ups).toBe(1);
    expect(snapshot.instances).toHaveLength(FIXTURE_CELLS.length);
    for (const instance of snapshot.instances) {
      expect(instance.instanceId).not.toBe('');
      expect(instance.type).not.toBe('');
    }
  });
});

describe('failing rules projection', () => {
  it('reports only errors and criticals, with the standard they come from', () => {
    // An almost-empty build fails plenty; that is what makes it a useful fixture.
    const result = projectFailingRules(emptyState());
    expect(result.failingCount).toBeGreaterThan(0);
    expect(result.rulePackVersion).not.toBe('');
    for (const rule of result.rules) {
      expect(['error', 'critical']).toContain(rule.severity);
      expect(rule.ruleId).not.toBe('');
      expect(rule.message).not.toBe('');
    }
  });

  it('filters to a single rule id when asked', () => {
    const all = projectFailingRules(emptyState());
    const first = all.rules[0];
    expect(first).toBeDefined();
    const one = projectFailingRules(emptyState(), first!.ruleId);
    expect(one.rules.every((r) => r.ruleId === first!.ruleId)).toBe(true);
    expect(one.rules.length).toBeGreaterThan(0);
  });
});

describe('tool execution', () => {
  function tool(name: string) {
    const found = WEBMCP_TOOLS.find((t) => t.name === name);
    expect(found, `no tool named ${name}`).toBeDefined();
    return found!;
  }

  it('returns MCP text content alongside structured output', async () => {
    const result = await tool('list_block_types').execute({});
    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.type).toBe('text');
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({ blocks: expect.any(Array) });
  });

  it('rejects an input the schema does not allow, without throwing', async () => {
    const result = await tool('place_block').execute({ type: 42 });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('type');
  });

  it('rejects an unknown block type by name', async () => {
    const result = await tool('place_block').execute({ type: 'definitely_not_a_block' });
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('definitely_not_a_block'),
    });
  });

  it('places and removes a block through the live store, and never echoes the cell', async () => {
    const placed = await tool('place_block').execute({ type: 'server_rack', position: { x: 4, y: 0, z: 9 } });
    const placedBody = JSON.parse(placed.content[0]!.text) as {
      ok: boolean;
      instanceId?: string;
    };
    expect(placedBody.ok).toBe(true);
    expect(placedBody.instanceId).toBeTypeOf('string');
    // The agent supplied (4, 0, 9); it does not get it back.
    expect(placed.content[0]!.text).not.toContain('"position"');
    expect(placed.content[0]!.text).not.toMatch(/-?\d+,-?\d+,-?\d+/);

    const removed = await tool('remove_block').execute({ instanceId: placedBody.instanceId });
    expect(JSON.parse(removed.content[0]!.text)).toMatchObject({ ok: true, type: 'server_rack' });
  });

  it('refuses a second block in an occupied cell with the store’s own reason', async () => {
    const first = await tool('place_block').execute({ type: 'server_rack', position: { x: 6, y: 0, z: 6 } });
    expect(JSON.parse(first.content[0]!.text).ok).toBe(true);

    const second = await tool('place_block').execute({
      type: 'server_rack',
      position: { x: 6, y: 0, z: 6 },
    });
    // "Cell occupied" is evaluatePlacement's wording, which is the point: the
    // tool is wrapping the real check rather than carrying a copy of it.
    expect(JSON.parse(second.content[0]!.text)).toMatchObject({
      ok: false,
      reason: 'Cell occupied',
    });
  });

  it('refuses a cell outside the build footprint', async () => {
    const result = await tool('place_block').execute({
      type: 'server_rack',
      position: { x: 9999, y: 0, z: 9999 },
    });
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({
      ok: false,
      reason: 'Outside the build footprint',
    });
  });

  it('auto-places when the agent gives no position, since it cannot see the layout', async () => {
    const result = await tool('place_block').execute({ type: 'server_rack' });
    const body = JSON.parse(result.content[0]!.text) as { ok: boolean; instanceId?: string };
    expect(body.ok).toBe(true);
    await tool('remove_block').execute({ instanceId: body.instanceId });
  });

  it('reports a missing instance id rather than failing silently', async () => {
    const result = await tool('remove_block').execute({ instanceId: 'nope' });
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({ ok: false });
  });

  it('keeps the snapshot free of coordinates when read from the live store', async () => {
    await tool('place_block').execute({ type: 'server_rack', position: { x: 2, y: 0, z: 3 } });
    const snapshot = await tool('get_build_snapshot').execute({});
    expect(snapshot.content[0]!.text).not.toContain('"position"');
    expect(snapshot.content[0]!.text).not.toContain('"byCell"');
    expect(snapshot.content[0]!.text).not.toMatch(/-?\d+,-?\d+,-?\d+/);
  });
});
