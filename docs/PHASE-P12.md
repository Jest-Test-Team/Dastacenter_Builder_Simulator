# Phase 12 — SimCity-like simulation

## Goal
Deliver the simcity-like simulation work so the rest of the product can build on it.

## Files added
`app/sim/[buildId]/page.tsx` (NPCs, events, gauges, controls).

## Key decisions
Player does not intervene in sim — it's the 'watch your design operate' mode. Sim randomness is non-deterministic on purpose; the score is not affected.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 13](./PHASE-P13.md)
