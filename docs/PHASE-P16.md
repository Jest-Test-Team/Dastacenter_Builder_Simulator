# Phase 16 — Performance budget

## Goal
Deliver the performance budget work so the rest of the product can build on it.

## Files added
Dynamic imports for R3F, three, wallet adapters. Bundle analyzer. `tests/unit/perf.test.ts`. `components/perf/WebVitalsReporter.tsx`. `app/api/vitals/route.ts`. CSP/HSTS/etc headers in `next.config.js`.

## Key decisions
Targets: < 250 kB initial, < 1.5 MB total. Lighthouse Performance ≥ 90. Bundle size is enforced via a CI warning, not a hard block.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 17](./PHASE-P17.md)
