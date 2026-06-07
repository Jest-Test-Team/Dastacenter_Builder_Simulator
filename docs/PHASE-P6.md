# Phase 6 — Persistence + sharing

## Goal
Deliver the persistence + sharing work so the rest of the product can build on it.

## Files added
`lib/persist/{index,share}.ts` (idb-keyval + LZ-string). useAutoSave, useSaveBuild, useLoadBuild, useSettings.

## Key decisions
The share token and the IDB record hold the same data. The token never expires (the snapshot is its own authority).

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 7](./PHASE-P7.md)
