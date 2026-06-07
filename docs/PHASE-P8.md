# Phase 8 — Curriculum content

## Goal
Deliver the curriculum content work so the rest of the product can build on it.

## Files added
`lib/content/modules.ts` (8 modules: site-selection, uptime-tiers, power-distribution, cooling-architecture, fire-protection, security-framework, esg-efficiency, network-sdn).

## Key decisions
Modules are data. Each has learning objectives, lessons, standards, and an optional scenarioId. The reader UI was added in P22.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 9](./PHASE-P9.md)
