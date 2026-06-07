# Phase 15 — Unit tests

## Goal
Deliver the unit tests work so the rest of the product can build on it.

## Files added
Vitest + jsdom. 30+ tests across grid, scoring, registry, share, SIWS, perf budget. `npm test` and `npm run test:coverage` wired in CI.

## Key decisions
The scoring engine is the most-tested piece because it is the certificate's authority.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 16](./PHASE-P16.md)
