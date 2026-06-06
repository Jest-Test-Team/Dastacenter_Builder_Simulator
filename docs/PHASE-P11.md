# Phase 11 — Credly integration

## Goal
Deliver the credly integration work so the rest of the product can build on it.

## Files added
`lib/credly/server.ts` (server-only, Basic Auth). `app/api/credly/issue/route.ts`.

## Key decisions
Route requires session + score ≥ 40 + opt-in. Env vars: CREDLY_API_TOKEN, CREDLY_ORG_ID, CREDLY_TEMPLATE_{LEVEL}.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 12](./PHASE-P12.md)
