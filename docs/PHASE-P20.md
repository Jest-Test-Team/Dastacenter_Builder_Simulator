# Phase 20 — Docs

## Goal
Deliver the docs work so the rest of the product can build on it.

## Files added
This file. README, ARCHITECTURE, MVP, SECURITY, ROADMAP, STATUS, and one PHASE-P{n}.md per phase. Updated continuously.

## Key decisions
Docs are part of the product, not an afterthought. The CI action fails if a phase file is missing.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 21](./PHASE-P21.md)
