# Project status

> Live progress. Updated as phases complete. See `PLAN.md` for the
> master 5,140-todo plan and `docs/PHASE-P{n}.md` for per-phase detail.

## Phase progress

| Phase   | Title                    | Status  | Notes                                                                            |
| ------- | ------------------------ | ------- | -------------------------------------------------------------------------------- |
| **P0**  | Project bootstrap        | ✅ done | Next 15 + TS strict + Tailwind + ESLint + Prettier + analyzer                    |
| **P1**  | Grid + block system      | ✅ done | `lib/grid` + `lib/blocks/{types,registry}`                                       |
| **P2**  | 3D builder (R3F)         | ✅ done | `BuilderCanvas`, `VoxelWorld` (instanced), `PlacementPreview`, `SiteEnvironment` |
| **P3**  | Palette / hotbar / modes | ✅ done | `BlockPalette`, `Hotbar`, `ModeBar`                                              |
| **P4**  | Build store + utils      | ✅ done | Zustand + zundo + `lib/utils`                                                    |
| **P5**  | Wallet auth (no email)   | ✅ done | wagmi + solana + SIWE + SIWS + iron-session + 4 auth routes                      |
| **P6**  | Persistence + sharing    | ✅ done | idb-keyval + LZ-string share tokens                                              |
| **P7**  | Scoring engine           | ✅ done | 60+ rules, 8 axes, deterministic                                                 |
| **P8**  | Curriculum content       | ✅ done | 8 modules in `lib/content/modules.ts`                                            |
| **P9**  | Result/scorecard UI      | ✅ done | `/result/[buildId]` with bars, issues, achievements                              |
| **P10** | Cert (SVG + QR)          | ✅ done | `/cert/[buildId]` + `CertificateSvg`                                             |
| **P11** | Credly integration       | ✅ done | Server route, Basic Auth, level→template mapping                                 |
| **P12** | SimCity-like simulation  | ✅ done | `/sim/[buildId]`, NPCs, events, gauges                                           |
| **P13** | Policy panel UI          | ✅ done | `PolicyPanel` wired to builder via right drawer                                  |
| **P14** | Security viz             | ✅ done | `CctvCoverage` cones, `SecurityFrameworkPanel` dashboard                         |
| **P15** | Unit tests               | ✅ done | 35 tests: grid, registry, scoring, score integrity, share, SIWS, perf            |
| **P16** | Performance budget       | ✅ done | Dynamic imports, `WebVitalsReporter`, CSP/HSTS, perf budget test                 |
| **P17** | Accessibility            | ✅ done | SkipLink, focus trap, reduced motion, ARIA, `KeyboardCheatsheet`                 |
| **P18** | i18n (en/zh-TW/ja)       | ✅ done | In-house i18n + `LocaleSwitcher` + 3 message bundles                             |
| **P19** | Analytics with consent   | ✅ done | `ConsentBanner`, `useConsent`, opt-in PostHog                                    |
| **P20** | Docs (per-phase)         | ✅ done | `docs/PHASE-P{0..24}.md` generated                                               |
| **P21** | DevOps (CI, deploy)      | ✅ done | GitHub Actions, Vercel config, health endpoint, robots.txt, sitemap              |
| **P22** | Marketing site           | ✅ done | `/pricing`, `/about`, `/status`, `/contact`                                      |
| **P23** | Legal/compliance         | ✅ done | ToS, Privacy, Cookies, DPA, AI policy templates                                  |
| **P24** | Launch checklist         | ✅ done | `docs/LAUNCH.md` (T-7d, T-24h, T-1h, T+0, post-launch), runbook                  |

Legend: ✅ done · 🟡 partial · ⏳ pending

**All 25 repository implementation phases have a working baseline. 35/35 tests pass and the production build is green. Public launch is not yet cleared because the external and operational items below remain open.**

## Build artifacts

- **Routes:** 23 (14 product + 5 legal + 4 marketing)
- **API routes:** 8 (auth×4, credly, health, vitals, walletconnect not used)
- **Components:** ~25 (builder, policy, wallet, cert, i18n, a11y, analytics, perf)
- **Lib modules:** ~20 (grid, blocks, store, scoring, persist, wallet, credly, content, i18n, analytics, observability, hooks, utils)
- **Tests:** 35 across 7 files
- **Docs:** 7 top-level + 25 per-phase + 2 incident files
- **Initial JS bundle:** 102 kB shared + per-route (target < 250 kB) ✅
- **Largest route:** `/sim/[buildId]` 365 kB (R3F + drei) — within budget
- **Typecheck:** clean
- **Lint:** clean (warnings only, no errors)
- **CI:** GitHub Actions, Vercel preview

## Open decisions

All originally open decisions have been resolved with the v1 defaults:

1. EVM-only at launch (Solana adapters are wired but disabled). EVM: mainnet, sepolia, base, optimism, arbitrum.
2. IndexedDB default; cloud sync is a Pro feature.
3. Simulation L1 (events only); L2 is Pro.
4. Target: prosumer / prosumer-pro (curious learners, students, junior engineers).
5. Open source (MIT).
6. Multiplayer co-build: planned for v1.2.
7. Monetization: Free + Pro + Enterprise.
8. Credly org: to be created at launch.
9. Cloud target: Vercel.
10. Telemetry: opt-in only, no third-party by default.

## Pre-launch checklist

See `docs/LAUNCH.md`. The short list:

- [ ] All 25 phases ✅
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` clean
- [ ] Lighthouse Performance ≥ 90
- [ ] Pen-test report clean
- [ ] Legal reviewed by counsel
- [ ] Security headers in production
- [ ] `/.well-known/security.txt` live
- [ ] Sentry + PostHog + status page configured
- [ ] On-call rotation
- [ ] Smoke test from fresh browser profile

## Remaining work audit

Repository work still required for the documented post-MVP roadmap:

- L2 simulation: staffing, OPEX, carbon, and water models.
- Multiplayer co-build with Yjs and opt-in encrypted cloud sync.
- Stripe billing and public build gallery.
- WCAG 2.2 AA audit fixes and mobile-first touch controls.
- Sustainability, quantum-ready, and modular block catalogs.
- Plugin API, public dashboard, AI co-designer, live operations twin, marketplace,
  white-label packaging, federated simulation, expanded translations, hardware
  integrations, and a public REST API.

External launch dependencies that cannot be completed from this repository alone:

- Legal review and signatures, penetration test, and accessibility audit sign-off.
- Production domain, DNSSEC/CAA, TLS preload, CDN rules, and status-page provider.
- Credly organization/templates, production WalletConnect, Sentry, and PostHog projects.
- Support inboxes, on-call rotation, incident drill, production rollback drill, and backups.
- Production Lighthouse run, wallet matrix smoke test, and Credly end-to-end issuance.

See `docs/ROADMAP.md` for product sequencing and `docs/LAUNCH.md` for the authoritative
operational checklist.
