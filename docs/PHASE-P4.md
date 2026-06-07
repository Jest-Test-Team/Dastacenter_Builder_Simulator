# Phase 4 — Build store + utils

## Goal
Deliver the build store + utils work so the rest of the product can build on it.

## Files added
`lib/store/build-store.ts` (Zustand + zundo). `lib/utils/{index,identity}.ts` (cn, shortAddress, buildIdFromSnapshot).

## Key decisions
State is plain data; UI lives in the same store for ergonomics. Zundo keeps a 50-step history. `loadBuild` is atomic and clears undo.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 5](./PHASE-P5.md)
