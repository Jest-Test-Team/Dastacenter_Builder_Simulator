/**
 * The disclosure gate's contract.
 *
 * This is the test that has to hold for the app's central claim to be honest:
 * a build handed to the assistant is reduced to a declared projection, and the
 * things that must never travel do not travel — under any setting, including
 * every field switched on.
 *
 * It asserts on the *serialized* payload rather than the object graph, because
 * that is what a network tab would show and what a log would keep. A field
 * hidden behind a getter or nested one level deeper would pass a shallow
 * key check and still leak.
 */

import { describe, expect, it } from 'vitest';
import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';
import { score } from '@/lib/scoring';
import {
  DISCLOSURE_FIELDS,
  defaultChoice,
  gate,
  GateResultSchema,
  type DisclosureChoice,
} from '@/lib/ai/disclosure';

function fixture(): BuildState {
  const state = emptyState();
  for (const [typeId, cell] of [
    ['floor_tile', { x: 3, y: 0, z: 7 }],
    ['ups', { x: 5, y: 0, z: 11 }],
    ['generator', { x: 9, y: 0, z: 2 }],
    ['cctv_camera', { x: 12, y: 0, z: 15 }],
  ] as const) {
    // Assert the placement landed: a fixture whose blocks silently failed to
    // place would make every "does not leak" assertion below vacuously true.
    expect(placeBlock(state, { typeId, cell })).not.toBeNull();
  }
  return state;
}

const everything: DisclosureChoice = Object.fromEntries(
  DISCLOSURE_FIELDS.map((f) => [f, true]),
) as DisclosureChoice;

describe('disclosure gate', () => {
  const state = fixture();
  const report = score(state);

  it('never emits grid coordinates, even with every field enabled', () => {
    const payload = JSON.stringify(gate(state, report, everything).context);
    // Each placed block's coordinates, in the two forms they are ever written.
    for (const instance of Object.values(state.voxels)) {
      const { x, y, z } = instance.position;
      expect(payload).not.toContain(`"${x},${y},${z}"`);
      expect(payload).not.toContain(`"position"`);
    }
    expect(payload).not.toContain('byCell');
    expect(payload).not.toContain('voxels');
  });

  it('never emits block instance ids', () => {
    const payload = JSON.stringify(gate(state, report, everything).context);
    for (const id of Object.keys(state.voxels)) expect(payload).not.toContain(id);
  });

  it('withholds the exact score by default and discloses it only on request', () => {
    expect(gate(state, report).context.overallScore).toBeUndefined();
    expect(gate(state, report).withheld).toContain('overallScore');
    expect(gate(state, report, everything).context.overallScore).toBe(report.score);
  });

  it('withholds PUE by default — it is the commercially sensitive number', () => {
    expect(gate(state, report).context.pue).toBeUndefined();
    expect(gate(state, report, everything).context.pue).toBe(report.pue);
  });

  it('emits nothing at all when every field is switched off', () => {
    const off = Object.fromEntries(DISCLOSURE_FIELDS.map((f) => [f, false])) as DisclosureChoice;
    const result = gate(state, report, off);
    expect(result.context).toEqual({});
    expect(result.disclosed).toEqual([]);
    expect(result.withheld).toHaveLength(DISCLOSURE_FIELDS.length);
  });

  it('accounts for every field as either disclosed or withheld', () => {
    const result = gate(state, report, defaultChoice());
    expect([...result.disclosed, ...result.withheld].sort()).toEqual([...DISCLOSURE_FIELDS].sort());
  });

  it('counts blocks by category without naming instances', () => {
    const counts = gate(state, report, everything).context.blockCountsByCategory ?? {};
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(
      Object.keys(state.voxels).length,
    );
  });

  it('rejects a wire payload carrying a field the projection does not define', () => {
    const smuggled = {
      context: { tier: 'III', voxels: { a: { x: 1, y: 0, z: 2 } } },
      disclosed: ['tier'],
      withheld: [],
    };
    expect(GateResultSchema.safeParse(smuggled).success).toBe(false);
  });

  it('accepts a genuine gate result over the wire', () => {
    const result = gate(state, report, defaultChoice());
    expect(GateResultSchema.safeParse(JSON.parse(JSON.stringify(result))).success).toBe(true);
  });
});
