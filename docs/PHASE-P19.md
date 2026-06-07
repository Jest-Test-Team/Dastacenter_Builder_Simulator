# Phase 19 — Analytics with consent

## Goal
Deliver the analytics with consent work so the rest of the product can build on it.

## Files added
`lib/analytics/index.tsx` (consent store, trackEvent, PageViewTracker). `components/analytics/ConsentBanner.tsx`.

## Key decisions
We never run analytics without explicit consent. The /api/vitals endpoint is our own; PostHog is opt-in and lazy-loaded.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 20](./PHASE-P20.md)
