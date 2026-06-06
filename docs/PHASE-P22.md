# Phase 22 — Marketing site

## Goal
Deliver the marketing site work so the rest of the product can build on it.

## Files added
`app/{pricing,status,about,contact}/page.tsx`. SEO metadata, OG image, sitemap, robots.

## Key decisions
Pricing tiers: Free (1 save, all standards cited), Pro (cloud sync, 100 saves), Enterprise (on-prem).

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 23](./PHASE-P23.md)
