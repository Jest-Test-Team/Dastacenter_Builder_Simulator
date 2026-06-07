# Phase 3 — Palette / hotbar / modes

## Goal
Deliver the palette / hotbar / modes work so the rest of the product can build on it.

## Files added
`components/builder/{BlockPalette,Hotbar,ModeBar}.tsx`.

## Key decisions
Inventory is shared between palette and hotbar. The hotbar auto-picks the most-recently-selected palette block. ModeBar has 3 modes: build, sim, inspect.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 4](./PHASE-P4.md)
