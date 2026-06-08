# Roadmap

> Post-launch. The MVP cut is in `docs/MVP.md`. Everything below is
> sequenced by the value-to-effort ratio, not calendar.

## v1.1 (1 month after launch)

- [x] Curriculum reading UI (`/learn/[moduleId]`) — content already exists.
- [x] Solana wallet (Phantom) — auth + identity already in code.
- [x] 3 pre-built scenarios: greenfield hyperscale, edge micro-DC, retrofit brownfield.
- [x] Keyboard shortcut cheatsheet (`?`).
- [x] Reduced-motion mode (skip camera damping).
- [x] 5-function security framework diagram on the policy panel.
- [x] 3 demo seeded builds (shareable URLs) — Greenfield T3, Edge Micro, Tier IV Retrofit.
- [x] Cert verifier page (`/verify`) for QR code scanning.
- [x] Onboarding overlay for first-time users.
- [x] Enhanced help/FAQ and credits pages.
- [x] E2E smoke tests with Playwright.

## v1.2 (2–3 months after)

- [x] L2 simulation depth: staffing, OPEX, carbon, water.
- Multiplayer co-build via Yjs (single room per build).
- Cloud sync opt-in (per-wallet E2EE; IndexedDB still primary).
- Stripe billing for the "Pro" tier (multi-build, save more than 5).
- Public build gallery (opt-in).
- i18n: zh-TW, ja.

## v1.3 (4–6 months after)

- A11y audit (WCAG 2.2 AA).
- Penetration test + bug bounty.
- Mobile-first controls (touch place, pinch zoom, two-finger orbit).
- New block categories: sustainability (solar, wind, fuel cell),
  quantum-ready (cryogenic dilution fridges), modular.
- [x] Plugin API for community block types (JSON schema, hot-loaded).
- Public dashboard: leaderboard, average PUE by region, etc.

## v2.0 (6–12 months after)

- AI co-designer: "design me a 2 MW edge DC near Frankfurt under
  €10 M" — uses the same scoring engine as a reward function.
- Real-time ops twin: connect to Prometheus/Modbus for live builds.
- Marketplace for "tuning presets" (e.g. "Singapore DIA-compliant
  build", "GDPR-strict build").
- White-label (OEM) packaging for cloud providers.

## v3.0 (12+ months)

- Multi-DC federated simulations.
- Curriculum in 12 languages, with translations community-sourced.
- Hardware integration (BMS, PDU, BMS) for physical testing rigs.
- Public REST API for embedding the simulator in third-party LMSs.

## Non-goals (explicit)

- We will never host builds on a server without explicit user opt-in.
- We will never sell user build data.
- We will never require KYC for the MVP.
- We will never auto-renew subscriptions without a 30-day notice.
