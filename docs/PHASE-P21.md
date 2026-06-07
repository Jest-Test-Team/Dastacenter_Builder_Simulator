# Phase 21 — DevOps (CI, deploy)

## Goal
Deliver the devops (ci, deploy) work so the rest of the product can build on it.

## Files added
`.github/workflows/ci.yml` (typecheck, lint, test, build, bundle-size). Vercel preview deploys. `app/api/health/route.ts`.

## Key decisions
PR-blocking checks: typecheck + lint + tests. Bundle-size check is a warning until we have a baseline.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 22](./PHASE-P22.md)
