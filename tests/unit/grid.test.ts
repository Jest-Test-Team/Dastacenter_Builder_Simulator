import { describe, it, expect } from 'vitest';
import { cellKey, parseCellKey, neighbors, inBounds, manhattan, chebyshev } from '@/lib/grid';

describe('grid utilities', () => {
  it('round-trips cellKey <-> parseCellKey', () => {
    const k = cellKey({ x: 3, y: 4, z: 5 });
    expect(parseCellKey(k)).toEqual({ x: 3, y: 4, z: 5 });
  });

  it('checks inBounds', () => {
    expect(inBounds({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 })).toBe(true);
    expect(inBounds({ x: 5, y: 0, z: 0 }, { x: 4, y: 4, z: 4 })).toBe(false);
    expect(inBounds({ x: -1, y: 0, z: 0 }, { x: 4, y: 4, z: 4 })).toBe(false);
  });

  it('returns 6 cardinal neighbors', () => {
    const n = neighbors({ x: 1, y: 1, z: 1 });
    expect(n).toHaveLength(6);
    expect(n).toContainEqual({ x: 2, y: 1, z: 1 });
    expect(n).toContainEqual({ x: 0, y: 1, z: 1 });
    expect(n).toContainEqual({ x: 1, y: 2, z: 1 });
    expect(n).toContainEqual({ x: 1, y: 0, z: 1 });
    expect(n).toContainEqual({ x: 1, y: 1, z: 2 });
    expect(n).toContainEqual({ x: 1, y: 1, z: 0 });
  });

  it('computes manhattan distance', () => {
    expect(manhattan({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 5 })).toBe(12);
  });

  it('computes chebyshev distance', () => {
    expect(chebyshev({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 5 })).toBe(5);
  });
});
