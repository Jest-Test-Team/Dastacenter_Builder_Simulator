# Phase 24 — Launch checklist

## Goal
Deliver the launch checklist work so the rest of the product can build on it.

## Files added
`docs/LAUNCH.md` (24h pre-flight, DNS warm-up, social cards, support email, status page, on-call rotation, rollback plan, post-launch retrospective).

## Key decisions
Once checked, the checklist is archived to `docs/INCIDENTS/launch-YYYY-MM-DD.md`.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 0](./PHASE-P0.md)
