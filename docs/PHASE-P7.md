# Phase 7 — Scoring engine

## Goal
Deliver the scoring engine work so the rest of the product can build on it.

## Files added
`lib/scoring/{engine,policy,index}.ts`. `lib/scoring/rules/index.ts` (~60 rules: UPTIME, TIA, EN50, ASHRAE, NFPA, POWER, COOL, ESG, SEC, PRIV, ISO27).

## Key decisions
Engine is 100% pure: no Date.now, no Math.random, no IO. The same input always produces the same report — this is what makes the certificate meaningful.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 8](./PHASE-P8.md)
