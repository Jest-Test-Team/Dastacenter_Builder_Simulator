import { describe, it, expect } from 'vitest';
import { cellKey, keyCell, neighbors, inBounds, manhattan, chebyshev, DEFAULT_GRID_SIZE } from '@/lib/grid';

describe('grid utilities', () => {
  it('round-trips cellKey <-> keyCell', () => {
    const k = cellKey({ x: 3, y: 4, z: 5 });
    expect(keyCell(k)).toEqual({ x: 3, y: 4, z: 5 });
  });

  it('checks inBounds', () => {
    expect(inBounds({ x: 0, y: 0, z: 0 }, { w: 4, h: 4, d: 4 })).toBe(true);
    expect(inBounds({ x: 5, y: 0, z: 0 }, { w: 4, h: 4, d: 4 })).toBe(false);
    expect(inBounds({ x: -1, y: 0, z: 0 }, { w: 4, h: 4, d: 4 })).toBe(false);
  });

  it('returns 6 cardinal neighbors with faces', () => {
    const n = neighbors({ x: 1, y: 1, z: 1 });
    expect(n).toHaveLength(6);
    const cells = n.map((x) => x.cell);
    expect(cells).toContainEqual({ x: 2, y: 1, z: 1 });
    expect(cells).toContainEqual({ x: 0, y: 1, z: 1 });
    expect(cells).toContainEqual({ x: 1, y: 2, z: 1 });
    expect(cells).toContainEqual({ x: 1, y: 0, z: 1 });
    expect(cells).toContainEqual({ x: 1, y: 1, z: 2 });
    expect(cells).toContainEqual({ x: 1, y: 1, z: 0 });
  });

  it('computes manhattan distance', () => {
    expect(manhattan({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 5 })).toBe(12);
  });

  it('computes chebyshev distance', () => {
    expect(chebyshev({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 5 })).toBe(5);
  });

  it('has a sensible default grid', () => {
    expect(DEFAULT_GRID_SIZE).toEqual({ w: 32, h: 8, d: 32 });
  });
});
