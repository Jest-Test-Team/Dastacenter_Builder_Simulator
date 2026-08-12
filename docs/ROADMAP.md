# Roadmap

> Post-launch. The MVP cut is in `docs/MVP.md`. Everything below is
> sequenced by the value-to-effort ratio, not calendar.
>
> Current state is in `docs/STATUS.md` — that is the authoritative tracker.
> Last reconciled with the code on **2026-08-12** (commit `605d533c`).

## Shipped since the original roadmap was written

These were not on the list; they came out of the ZK / on-chain direction.

- [x] Knowledge graph pipeline — extract, fuse, gate, digest, serve (P37).
- [x] Network / SDN spatial modelling and multi-floor xray (P38).
- [x] **On-chain SBT certificates** replacing Credly entirely (P39).
      Live on Polygon Amoy + Ethereum Sepolia; minting is gasless via a server relay.
- [x] Compact / Midnight circuit — written, compiled, tested. **Proving is blocked upstream**
      by a compiler/proof-server version gap; see `docs/MIDNIGHT_ZK.md` (P40).
- [x] **Real zero-knowledge proofs** via Noir + Barretenberg — 1.4 s prove, 0.4 s verify (P41).
- [x] CI recovery: five stacked failures, green since 2026-08-11 (P42).
- [x] KSN R3F intro sequence (P43).
- [x] Demo path: proving console, private-data marker, dividend preview (P44).

## Next up (ordered by value to effort)

1. **Move `/api/zk/prove` to a Node host.** bb.js WASM cannot run on Cloudflare Workers, so
   the deployed site currently falls back to the forgeable mock. This is the single highest-value
   item: it is the difference between claiming real ZK and having it in production.
2. **Deploy P41–P44** (`npm run deploy`). The live site is behind `main`.
3. **Prove in the browser.** bb.js supports it. The witness would then never leave the user's
   machine at all, which is a materially stronger privacy claim than the current
   browser-derives-digest / server-proves split.
4. Revisit Midnight when a compiler targeting the v4 runtime / ledger-v9 ships.

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

- We will never present a simulated proof as a cryptographic one. The proving console names
  the backend and certificate metadata records it on-chain; both are covered by tests.

- We will never host builds on a server without explicit user opt-in.
- We will never sell user build data.
- We will never require KYC for the MVP.
- We will never auto-renew subscriptions without a 30-day notice.
