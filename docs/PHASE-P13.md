# Phase 13 — Policy panel UI

## Goal
Deliver the policy panel ui work so the rest of the product can build on it.

## Files added
`components/policy/PolicyPanel.tsx` (drawer with focus trap, ARIA dialog, 10 groups).

## Key decisions
Each toggle feeds the scoring engine alongside the 3D blocks. The same `PolicyState` is used by sim and by the cert.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 14](./PHASE-P14.md)
