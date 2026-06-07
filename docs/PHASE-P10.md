# Phase 10 — Cert (SVG + QR)

## Goal
Deliver the cert (svg + qr) work so the rest of the product can build on it.

## Files added
`components/cert/CertificateSvg.tsx`. `app/cert/[buildId]/page.tsx`.

## Key decisions
SVG is built with React JSX, never innerHTML. The QR code points to a verifier route that re-runs the score from the embedded snapshot.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 11](./PHASE-P11.md)
