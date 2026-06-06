/**
 * Core grid math types and helpers.
 * A voxel grid where every cell is 1m on a side, addressed by integer (x,y,z).
 *
 * Coordinates:
 *  - x: east (positive)
 *  - y: up (positive, 0 = ground)
 *  - z: south (positive)
 *  - All values in meters.
 */

import { z } from 'zod';

export const CellSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
});
export type Cell = z.infer<typeof CellSchema>;

export const CellKeySchema = z.string().regex(/^-?\d+,-?\d+,-?\d+$/);
export type CellKey = string;

export const GridSizeSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  d: z.number().int().positive(),
});
export type GridSize = z.infer<typeof GridSizeSchema>;

export const AABBSchema = z.object({
  min: CellSchema,
  max: CellSchema,
});
export type AABB = z.infer<typeof AABBSchema>;

export const FaceSchema = z.enum(['top', 'bottom', 'north', 'south', 'east', 'west']);
export type Face = z.infer<typeof FaceSchema>;

export const RotationSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export type Rotation = z.infer<typeof RotationSchema>;

/** Canonical "x,y,z" key for a cell. */
export function cellKey(cell: Cell): CellKey {
  return `${cell.x},${cell.y},${cell.z}`;
}

/** Parse a "x,y,z" key into a Cell. */
export function keyCell(key: CellKey): Cell {
  const [x, y, z] = key.split(',').map(Number);
  return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
}

/** All 6 neighbors of a cell across faces. */
export function neighbors(cell: Cell): Array<{ face: Face; cell: Cell }> {
  return [
    { face: 'top', cell: { x: cell.x, y: cell.y + 1, z: cell.z } },
    { face: 'bottom', cell: { x: cell.x, y: cell.y - 1, z: cell.z } },
    { face: 'north', cell: { x: cell.x, y: cell.y, z: cell.z - 1 } },
    { face: 'south', cell: { x: cell.x, y: cell.y, z: cell.z + 1 } },
    { face: 'east', cell: { x: cell.x + 1, y: cell.y, z: cell.z } },
    { face: 'west', cell: { x: cell.x - 1, y: cell.y, z: cell.z } },
  ];
}

/** Test whether a cell is within grid bounds. */
export function inBounds(cell: Cell, size: GridSize): boolean {
  return (
    cell.x >= 0 &&
    cell.x < size.w &&
    cell.y >= 0 &&
    cell.y < size.h &&
    cell.z >= 0 &&
    cell.z < size.d
  );
}

/** Build an AABB from a base cell and a [w,h,d] size. */
export function aabbFromCell(base: Cell, size: [number, number, number]): AABB {
  return {
    min: base,
    max: { x: base.x + size[0] - 1, y: base.y + size[1] - 1, z: base.z + size[2] - 1 },
  };
}

/** Test AABB intersection. */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

/** Iterate every cell in an AABB. */
export function* aabbIter(a: AABB): Generator<Cell> {
  for (let x = a.min.x; x <= a.max.x; x++) {
    for (let y = a.min.y; y <= a.max.y; y++) {
      for (let z = a.min.z; z <= a.max.z; z++) {
        yield { x, y, z };
      }
    }
  }
}

/** Manhattan distance between two cells. */
export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

/** Chebyshev distance (max of axis deltas). */
export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

/** Default build grid size. */
export const DEFAULT_GRID_SIZE: GridSize = { w: 32, h: 8, d: 32 };
