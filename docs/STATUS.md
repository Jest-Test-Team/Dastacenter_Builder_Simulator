# Project status

> Live progress. Updated each phase boundary. See `PLAN.md` for the
> master 5,140-todo plan.

## Phase progress

| Phase | Title | Status | Notes |
| --- | --- | --- | --- |
| **P0** | Project bootstrap | ✅ done | Next 15 + TS strict + Tailwind + ESLint + Prettier + analyzer |
| **P1** | Grid + block system | ✅ done | `lib/grid` + `lib/blocks/{types,registry}` |
| **P2** | 3D builder (R3F) | ✅ done | `BuilderCanvas`, `VoxelWorld` (instanced), `PlacementPreview` |
| **P3** | Palette / hotbar / modes | ✅ done | `BlockPalette`, `Hotbar`, `ModeBar` |
| **P4** | Build store + utils | ✅ done | Zustand + zundo + `lib/utils` |
| **P5** | Wallet auth (no email) | ✅ done | wagmi + solana + SIWE + SIWS + iron-session + 4 auth routes |
| **P6** | Persistence + sharing | ✅ done | idb-keyval + LZ-string share tokens |
| **P7** | Scoring engine | ✅ done | 60+ rules, 8 axes, deterministic |
| **P8** | Curriculum content | ✅ done | 8 modules in `lib/content/modules.ts` |
| **P9** | Result/scorecard UI | ✅ done | `/result/[buildId]` with bars, issues, achievements |
| **P10** | Cert (SVG + QR) | ✅ done | `/cert/[buildId]` + `CertificateSvg` |
| **P11** | Credly integration | ✅ done | Server route, Basic Auth, level→template mapping |
| **P12** | SimCity-like simulation | ✅ done | `/sim/[buildId]`, NPCs, events, gauges |
| **P13** | Policy panel UI | ✅ done | `PolicyPanel` wired to builder via right drawer |
| **P14** | Security viz | ⏳ pending | CCTV cones, 5-function dashboard |
| **P15** | Unit tests | 🟡 partial | grid + scoring; need registry/share/wallet |
| **P16** | Performance budget | ⏳ pending | bundle < 250 kB initial, < 1.5 MB total |
| **P17** | Accessibility | ⏳ pending | keyboard, screen-reader labels, reduced motion |
| **P18** | i18n (en/zh-TW/ja) | ⏳ pending | next-intl setup |
| **P19** | Analytics (consent) | ⏳ pending | PostHog + consent gate |
| **P20** | Docs (README + per-phase) | 🟡 partial | README done, per-phase pages next |
| **P21** | DevOps (CI, deploy) | ⏳ pending | GH Actions, Vercel preview |
| **P22** | Marketing site | ⏳ partial | landing page exists; pricing/legal pending |
| **P23** | Legal/compliance | ⏳ pending | ToS, Privacy, DPA, AI policy |
| **P24** | Launch checklist | ⏳ pending | 24h pre-flight, on-call rotation |

Legend: ✅ done · 🟡 partial · ⏳ pending

## Open decisions (awaiting user input)

1. EVM-only v1, or both EVM + Solana at launch?
2. Persistence: IndexedDB default, or also offer cloud sync?
3. Simulation depth: L1 (events) only, or L2 (staffing, OPEX)?
4. Target user: prosumer / prosumer-pro / prosumer-enterprise?
5. Open source (MIT) vs. source-available (BSL)?
6. Multiplayer co-build?
7. Monetization: free / freemium / paid?
8. Credly org — created and templates configured?
9. Cloud target: Vercel / Cloudflare Pages / own infra?
10. Telemetry: zero / anonymous aggregates / opt-in product analytics?
