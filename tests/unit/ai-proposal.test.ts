/**
 * Applying a model's proposal.
 *
 * The rule under test is that the engine, not the model, decides what happens:
 * a proposal is validated against the real grid, re-scored by the deterministic
 * rules engine, and anything that will not fit is reported rather than dropped.
 * The reader's own build is never mutated by any of it.
 */

import { describe, expect, it } from 'vitest';
import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';
import { applyProposal } from '@/lib/ai/proposal';

function fixture(): BuildState {
  const state = emptyState();
  expect(placeBlock(state, { typeId: 'floor_tile', cell: { x: 0, y: 0, z: 0 } })).not.toBeNull();
  return state;
}

describe('applyProposal', () => {
  it('leaves the caller\'s build untouched', () => {
    const state = fixture();
    const before = JSON.stringify(state);
    applyProposal(state, [{ blockId: 'ups', quantity: 2, why: 'redundant power' }]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('places what fits and re-scores the clone', () => {
    const state = fixture();
    const preview = applyProposal(state, [{ blockId: 'ups', quantity: 2, why: 'redundant power' }]);
    expect(preview.applied).toHaveLength(1);
    expect(preview.applied[0]?.placed).toBe(2);
    expect(Object.keys(preview.state.voxels)).toHaveLength(3);
    // Both sides are scored by the same engine and the same rule pack, so the
    // before/after the UI shows is a like-for-like comparison.
    expect(preview.after.rulePackVersion).toBe(preview.before.rulePackVersion);
    expect(preview.after.score).not.toBe(preview.before.score);
  });

  it('reports an unplaceable item as rejected rather than dropping it', () => {
    const state = fixture();
    const preview = applyProposal(state, [
      { blockId: 'not_a_real_block', quantity: 1, why: 'hallucinated' },
    ]);
    expect(preview.applied).toHaveLength(0);
    expect(preview.rejected).toHaveLength(1);
    expect(preview.rejected[0]?.reason).toBeTruthy();
  });

  it('records a partial placement with its shortfall', () => {
    const state = fixture();
    const preview = applyProposal(state, [{ blockId: 'generator', quantity: 3, why: 'backup' }]);
    const item = preview.applied[0] ?? preview.rejected[0];
    expect(item?.requested).toBe(3);
    expect(item?.placed).toBeLessThanOrEqual(3);
  });
});
