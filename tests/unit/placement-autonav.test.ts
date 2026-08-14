/**
 * Drag auto-navigation: findNearestLegalCell snaps a placement to the closest
 * legal spot when the cursor's cell is occupied or outside the footprint, so a
 * user can always drop a component somewhere sensible instead of hitting a red
 * "Outside the build footprint" / "Cell occupied" wall.
 */

import { describe, expect, it } from 'vitest';
import { evaluatePlacement, findNearestLegalCell } from '@/lib/store/build-store';
import { DEFAULT_GRID_SIZE } from '@/lib/grid';

const gridSize = DEFAULT_GRID_SIZE;
const rotation = 0 as const;
// A 1x1x1 block with inventory available (utility_feed exists in the registry).
const type = 'utility_feed';
const inventory = { [type]: 5 };

function legal(cell: { x: number; y: number; z: number }, byCell: Record<string, string>) {
  return evaluatePlacement({ type, position: cell, rotation, gridSize, byCell, inventory }).ok;
}

describe('findNearestLegalCell (drag auto-navigation)', () => {
  it('returns the target itself when it is already legal', () => {
    const target = { x: 5, y: 0, z: 5 };
    const cell = findNearestLegalCell({ type, target, rotation, gridSize, byCell: {}, inventory });
    expect(cell).toEqual(target);
  });

  it('snaps to an adjacent free cell when the target is occupied', () => {
    const target = { x: 5, y: 0, z: 5 };
    const byCell = { '5,0,5': 'someBlock' };
    const cell = findNearestLegalCell({ type, target, rotation, gridSize, byCell, inventory });
    expect(cell).not.toBeNull();
    expect(cell).not.toEqual(target);
    // Adjacent (Chebyshev distance 1) and actually legal.
    expect(Math.max(Math.abs(cell!.x - 5), Math.abs(cell!.z - 5))).toBe(1);
    expect(legal(cell!, byCell)).toBe(true);
  });

  it('pulls an out-of-bounds cursor back to the nearest in-footprint cell', () => {
    const target = { x: gridSize.w + 10, y: 0, z: -8 };
    const cell = findNearestLegalCell({ type, target, rotation, gridSize, byCell: {}, inventory });
    expect(cell).not.toBeNull();
    expect(cell!.x).toBeGreaterThanOrEqual(0);
    expect(cell!.x).toBeLessThan(gridSize.w);
    expect(cell!.z).toBeGreaterThanOrEqual(0);
    expect(cell!.z).toBeLessThan(gridSize.d);
    expect(legal(cell!, {})).toBe(true);
  });

  it('returns null when inventory is exhausted (moving cannot help)', () => {
    const cell = findNearestLegalCell({
      type,
      target: { x: 5, y: 0, z: 5 },
      rotation,
      gridSize,
      byCell: {},
      inventory: { [type]: 0 },
    });
    expect(cell).toBeNull();
  });
});
