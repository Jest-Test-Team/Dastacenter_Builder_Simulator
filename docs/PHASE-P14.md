# Phase 14 — Security viz

## Goal
Deliver the security viz work so the rest of the product can build on it.

## Files added
`components/builder/CctvCoverage.tsx` (cones, inspect-mode only). `components/builder/SecurityFrameworkPanel.tsx` (live coverage %).

## Key decisions
Coverage is a 45° half-angle cone at 12m range; configurable per-camera in v1.1. The dashboard computes % on the client from the same PolicyState the engine uses.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 15](./PHASE-P15.md)
