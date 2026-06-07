# Phase 1 — Grid + block system

## Goal
Deliver the grid + block system work so the rest of the product can build on it.

## Files added
`lib/grid/index.ts` (Cell, GridSize, AABB, neighbors, inBounds, manhattan, chebyshev); `lib/blocks/{types,registry,index}.ts` (~40 block defs across 7 categories with port/rule/standards metadata).

## Key decisions
Cell is a 3-int tuple. GridSize is w/h/d. AABB is the bounding-box helper used by every collision and adjacency check. The registry is a frozen array; adding a block is one entry.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 2](./PHASE-P2.md)
