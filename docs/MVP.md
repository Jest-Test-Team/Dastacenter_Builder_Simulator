# MVP cut

A 1,520-todo subset of the master 5,140-todo `PLAN.md`, designed to ship a
credible, demoable product in ~6 weeks. Everything else is post-launch.

## In MVP

- **Builder**: 1 scenario (free), 1 grid (32×8×32), all 7 categories,
  40+ block types, undo/redo, share, autosave.
- **Wallet**: MetaMask + WalletConnect + Coinbase. No Solana.
- **Scoring**: Uptime tier + ASHRAE + NFPA + ISO 27001 + TIA-942 +
  EN 50600 + ESG (PUE/WUE). One unified 0–100 score.
- **Cert**: SVG + QR; downloadable. Credly push behind a "publish"
  checkbox; no credly-required onboarding.
- **Sim**: 1-minute auto-run, deterministic for the score, animated
  for the demo.
- **i18n**: English only. Strings externalized for v2.
- **Docs**: README, ARCHITECTURE, STATUS, MVP (this file).

## Out of MVP (post-launch)

- Curriculum pages (the 8 modules are already authored; reading UI
  is a v1.1 feature).
- Multiple scenarios (colocation, hyperscale, edge).
- Multiplayer co-build.
- Account sync (cross-device).
- Mobile-first controls.
- L2 sim depth (staffing, OPEX, carbon).
- Solana wallet support.
- Telemetry beyond Vercel Web Analytics (privacy-respecting aggregate).
- Stripe billing.
- Admin console.
- Plugin system for new block types.
- A11y audit (keyboard nav, screen-reader walkthrough).
- Penetration test.

## Success criteria

- Lighthouse Performance ≥ 90, A11y ≥ 90, Best Practices ≥ 90.
- LCP < 2.5 s on a 4G throttled run.
- First contentful paint < 1 s.
- Bundle < 250 kB initial, < 1.5 MB total.
- Build/sim/score/cert round-trip < 60 s for a new user.
- `npm run build && npm test` passes green.
- 10 demo scenarios pre-built and shareable.
- 1 published Credly badge per level.
