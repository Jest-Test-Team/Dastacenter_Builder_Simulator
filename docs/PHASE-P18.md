# Phase 18 — i18n (en/zh-TW/ja)

## Goal
Deliver the i18n (en/zh-tw/ja) work so the rest of the product can build on it.

## Files added
`lib/i18n/{index,server}.ts`. `lib/i18n/messages/{en,zh-TW,ja}.json`. `components/i18n/LocaleSwitcher.tsx`.

## Key decisions
We chose an in-house i18n over next-intl to avoid a router refactor. Adding a locale is one new JSON file + one entry in `LOCALES`.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 19](./PHASE-P19.md)
