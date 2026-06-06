import { describe, it, expect } from 'vitest';
import { score } from '@/lib/scoring/engine';
import { emptyState, placeBlock } from '@/lib/blocks';
import { defaultPolicyState } from '@/lib/scoring/policy';
import type { BuildState } from '@/lib/blocks';

function makeState(): BuildState {
  return {
    ...emptyState(),
    policies: defaultPolicyState(),
  };
}

describe('scoring engine', () => {
  it('returns a low score for an empty build', () => {
    const r = score(makeState());
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThan(85);
    // empty build should have no certified tier
    expect(r.tier).toBe('F');
  });

  it('returns a high score for a redundant, cooled, secured build', () => {
    const s = makeState();
    for (let i = 0; i < 4; i++) placeBlock(s, { typeId: 'it.server.generic', cell: { x: 4 + i, y: 1, z: 4 } });
    placeBlock(s, { typeId: 'power.utility.a', cell: { x: 0, y: 1, z: 4 } });
    placeBlock(s, { typeId: 'power.utility.b', cell: { x: 0, y: 1, z: 5 } });
    placeBlock(s, { typeId: 'power.ups', cell: { x: 1, y: 1, z: 4 } });
    placeBlock(s, { typeId: 'power.generator.diesel', cell: { x: 1, y: 1, z: 5 } });
    placeBlock(s, { typeId: 'cooling.crac', cell: { x: 4, y: 1, z: 3 } });
    placeBlock(s, { typeId: 'safety.fire.panel', cell: { x: 0, y: 1, z: 0 } });
    placeBlock(s, { typeId: 'safety.sprinkler.fm200', cell: { x: 4, y: 2, z: 4 } });
    placeBlock(s, { typeId: 'safety.cctv', cell: { x: 16, y: 0, z: 0 } });
    placeBlock(s, { typeId: 'safety.mantrap', cell: { x: 0, y: 1, z: 16 } });
    placeBlock(s, { typeId: 'safety.bollard', cell: { x: 16, y: 0, z: 16 } });
    for (const k of Object.keys(s.policies)) {
      const v = s.policies[k as keyof typeof s.policies];
      if (typeof v === 'boolean') (s.policies as Record<string, unknown>)[k] = true;
    }
    const r = score(s);
    expect(r.score).toBeGreaterThan(60);
    expect(['Silver', 'Gold', 'Platinum']).toContain(r.level);
  });

  it('is deterministic', () => {
    const s1 = makeState();
    const s2 = makeState();
    placeBlock(s1, { typeId: 'it.server.generic', cell: { x: 4, y: 1, z: 4 } });
    placeBlock(s2, { typeId: 'it.server.generic', cell: { x: 4, y: 1, z: 4 } });
    const r1 = score(s1);
    const r2 = score(s2);
    expect(r1.score).toBe(r2.score);
    expect(r1.level).toBe(r2.level);
    expect(r1.tier).toBe(r2.tier);
  });

  it('produces a non-empty issues list for an empty build', () => {
    const r = score(makeState());
    expect(r.issues.length).toBeGreaterThan(0);
  });
});
