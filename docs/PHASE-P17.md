# Phase 17 — Accessibility

## Goal
Deliver the accessibility work so the rest of the product can build on it.

## Files added
`components/a11y/{SkipLink,KeyboardCheatsheet}.tsx`. `lib/hooks/{useFocusTrap,useReducedMotion}.ts`. ARIA on PolicyPanel. `id='main'` on every page.

## Key decisions
WCAG 2.2 AA target. The cheatsheet is the lowest-cost way to teach new users the shortcuts.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 18](./PHASE-P18.md)
