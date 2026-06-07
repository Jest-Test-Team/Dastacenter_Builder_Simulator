# Phase 9 — Result/scorecard UI

## Goal
Deliver the result/scorecard ui work so the rest of the product can build on it.

## Files added
`app/result/[buildId]/page.tsx`. Scorecard + per-axis bars + issue list + achievements + cert CTA.

## Key decisions
The page re-runs `score(state)` on the client. It must be byte-identical to the cert engine's output.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 10](./PHASE-P10.md)
