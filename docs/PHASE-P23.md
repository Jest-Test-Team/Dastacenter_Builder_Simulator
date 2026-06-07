# Phase 23 — Legal/compliance

## Goal
Deliver the legal/compliance work so the rest of the product can build on it.

## Files added
`app/{legal/terms,legal/privacy,legal/cookies,legal/dpa,legal/ai}/page.tsx`. Reviewed by counsel before public.

## Key decisions
All legal docs are templates; final sign-off requires a licensed attorney.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 24](./PHASE-P24.md)
