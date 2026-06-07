# Datacenter Builder Simulator

> Build a Lego-style data center, run it in a SimCity-like simulation, score it
> against international standards, and earn a publishable certificate.

A pure-frontend SaaS built on **Next.js 15 + React Three Fiber**. Wallet-only
auth (no email/password). Builds are scored deterministically against
**Uptime, TIA-942, EN 50600, ASHRAE, NFPA, ISO 27001, EU EED, SG DIA, DE EnEfG,
CN PUE**. A SVG certificate is generated client-side and, with the user's
consent, pushed to **Credly** as a portable digital badge.

---

## Quick start

```bash
git clone <this repo>
cd Dastacenter_Builder_Sinulator
npm install --legacy-peer-deps   # React 19 RC peer-dep conflict workaround
cp .env.example .env.local       # fill in SESSION_SECRET at minimum
npm run dev                      # → http://localhost:3000
```

Open `http://localhost:3000` → click **Build** → drag blocks from the left
palette into the 3D grid. Press <kbd>1–9</kbd> to switch the hotbar slot,
<kbd>R</kbd> to rotate, right-click to place, <kbd>Esc</kbd> to cancel, <kbd>?</kbd>
for the full cheat sheet.

## Features

- **3D builder** — 32×8×32 voxel grid, 40+ block types across 7 categories
  (structure, site, power, cooling, IT, safety, network).
- **Policy panel** — toggle the 3 deterrence categories, 5 security
  functions, privacy, and ESG targets.
- **Standards-cited scoring** — ~60 rules across Uptime Tier, TIA-942,
  EN 50600, ASHRAE TC 9.9, NFPA 75/2001, ISO/IEC 27001, EU EED, SG DIA,
  DE EnEfG, CN PUE, SOC 2, NIST SP 800-30. Per-axis scores (0–100)
  with weighted overall, Uptime tier (I–IV or F), cert level
  (Bronze/Silver/Gold/Platinum).
- **Verifiable certificate** — client-side SVG, QR code, downloadable,
  opt-in Credly push.
- **SimCity-like sim** — NPCs walk the build, scheduled events fire, power
  - temperature gauges oscillate. Re-uses the same build state.
- **Security viz** — CCTV coverage cones (inspect mode), live 5-function
  framework dashboard.
- **Curriculum** — 8 modules, ~5 hours of standards-cited learning content.
- **Share** — LZ-string-compressed snapshot in a URL.
- **Autosave** — IndexedDB, debounced 1.5 s.
- **Wallet auth** — MetaMask, WalletConnect, Coinbase, Phantom (EVM) via
  wagmi; SIWE for EVM. SIWS for Solana via tweetnacl + bs58.
- **i18n** — English (default), 繁體中文, 日本語.
- **A11y** — Skip link, focus trap on dialogs, ARIA roles, reduced-motion
  hook, keyboard cheatsheet, `id="main"` on every page.
- **PWA-ready, no third-party trackers** — analytics is opt-in only.

## Stack

| Layer       | Tech                                                                |
| ----------- | ------------------------------------------------------------------- |
| Framework   | Next.js 15 (App Router, RSC + client)                               |
| 3D          | React Three Fiber + drei + three.js                                 |
| State       | Zustand + zundo (temporal)                                          |
| Wallet      | wagmi (EVM) + Solana wallet adapters                                |
| Auth        | SIWE (EVM) + custom SIWS (Solana) via iron-session httpOnly cookies |
| Persistence | IndexedDB (idb-keyval) — fully client-side                          |
| Sharing     | LZ-string-encoded snapshot in URL                                   |
| Scoring     | Pure functions, fully deterministic (no Date.now/Random in core)    |
| Cert        | SVG, generated client-side; QR via `qrcode.react`                   |
| Credly      | Server route only (Basic Auth) — opt-in, never in client bundle     |
| Tests       | Vitest + Testing Library (jsdom) — 35 tests, all green              |
| Styling     | Tailwind + CSS variables (no UI framework)                          |
| i18n        | Custom in-house (3 locales: en, zh-TW, ja)                          |
| Analytics   | PostHog, lazy-loaded, consent-gated                                 |

## Project structure

```
src/
├─ app/                          # Next.js App Router
│  ├─ page.tsx                   # Landing
│  ├─ build/[scenarioId]/        # 3D builder
│  ├─ sim/[buildId]/             # SimCity-like sim mode
│  ├─ result/[buildId]/          # Scorecard + issues + achievements
│  ├─ cert/[buildId]/            # SVG certificate + Credly push
│  ├─ learn/                     # Curriculum (8 modules)
│  ├─ pricing/                   # Pricing tiers
│  ├─ about/                     # About page
│  ├─ status/                    # System status
│  ├─ contact/                   # Contact
│  ├─ legal/{terms,privacy,cookies,dpa,ai}/   # Legal pages
│  └─ api/
│     ├─ auth/{nonce,verify,session,logout}/
│     ├─ credly/issue/
│     ├─ health/                 # Liveness
│     └─ vitals/                 # Web Vitals beacon
├─ components/
│  ├─ builder/                   # BuilderCanvas, VoxelWorld, palette,
│  │                             # hotbar, mode, CctvCoverage,
│  │                             # SecurityFrameworkPanel
│  ├─ policy/                    # PolicyPanel
│  ├─ wallet/                    # WalletPicker
│  ├─ cert/                      # CertificateSvg
│  ├─ i18n/                      # LocaleSwitcher
│  ├─ a11y/                      # SkipLink, KeyboardCheatsheet
│  ├─ analytics/                 # ConsentBanner
│  └─ perf/                      # WebVitalsReporter
├─ lib/
│  ├─ grid/                      # Voxel grid utilities
│  ├─ blocks/                    # Block types, registry, placement
│  ├─ store/                     # Zustand build store
│  ├─ scoring/                   # engine + ~60 rules + policy plane
│  ├─ persist/                   # IndexedDB + share token
│  ├─ wallet/                    # wagmi, solana, siwe, siws, iron-session
│  ├─ credly/                    # Server-side REST client
│  ├─ content/                   # Learning modules
│  ├─ i18n/                      # In-house i18n (en, zh-TW, ja)
│  ├─ analytics/                 # PostHog, consent store
│  ├─ observability/             # Sentry (optional)
│  ├─ hooks/                     # useFocusTrap, useReducedMotion
│  └─ utils/                     # classnames, shortAddress, identity
├─ types/                        # Ambient .d.ts for 3rd-party modules
└─ styles/                       # tailwind globals
tests/
└─ unit/                         # grid, scoring, registry, share, siws, perf
docs/
├─ STATUS.md                     # Live phase progress
├─ ARCHITECTURE.md               # System diagrams
├─ MVP.md                        # MVP cut
├─ SECURITY.md                   # Threat model
├─ ROADMAP.md                    # Post-launch
├─ LAUNCH.md                     # 24h pre-flight + runbook
├─ PHASE-P{0..24}.md             # One page per phase
└─ INCIDENTS/                    # Runbook + per-incident archive
```

## Scripts

| Command                 | What it does                                      |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Local dev server on :3000                         |
| `npm run build`         | Production build                                  |
| `npm run start`         | Run production build                              |
| `npm run lint`          | Next.js + TypeScript ESLint                       |
| `npm run typecheck`     | `tsc --noEmit` (strict, noUncheckedIndexedAccess) |
| `npm test`              | Vitest (jsdom) — 35 tests, all green              |
| `npm run test:watch`    | Vitest watch                                      |
| `npm run test:coverage` | Vitest + v8 coverage                              |
| `npm run format`        | Prettier write                                    |
| `npm run format:check`  | Prettier check                                    |
| `npm run analyze`       | `next build` with bundle analyzer                 |

## Standards citations

The scoring engine cites these standards (rule IDs prefix the standard):

- **Uptime Institute** — Tier I–IV
- **TIA-942-C** — Telecommunications Infrastructure for Data Centers
- **EN 50600-1** — European general requirements
- **ASHRAE TC 9.9** — Thermal guidelines (A1–A4)
- **NFPA 75/76/855** — Fire protection
- **ISO/IEC 27001:2022** — Information security
- **EU EED (2023/1791)** — Energy Efficiency Directive, Article 12
- **SG DCA DR** — Singapore Data Centre Designated Code (Green Mark DC)
- **DE EnEfG** — Energieeffizienzgesetz (PUE ≤ 1.5 from 2025, ≤ 1.3 from 2026)
- **CN GB 40879** — Data center PUE limits (≤ 1.3 in 2025)
- **SOC 2** — Trust services criteria
- **NIST SP 800-30** — Risk assessment
- **NIST CSF 2.0** — Cybersecurity Framework (5 functions)

See `src/lib/scoring/rules/index.ts` for the full per-rule citations.

## Performance budget

- Initial JS bundle: **< 250 kB** gzipped.
- 200-block scoring run: **< 100 ms** (see `tests/unit/perf.test.ts`).
- Lighthouse targets: **Performance ≥ 90, A11y ≥ 90, Best Practices ≥ 90, SEO ≥ 90**.
- Per-block-type InstancedMesh keeps the 3D draw call count in single digits
  even with thousands of voxels.

## Privacy & data

The app is **pure-frontend**. Builds are stored in your browser's IndexedDB.
Wallet signatures are the only server interaction, used to prove ownership
of the certificate being claimed. **No emails, no tracking pixels, no
server-side analytics by default.** PostHog is opt-in via the consent banner.
See `docs/SECURITY.md` for the full threat model and `docs/LAUNCH.md` for
the incident runbook.

## Deployment

The repo ships with a `vercel.json` (regions, headers) and a GitHub Actions
CI workflow (`.github/workflows/ci.yml`). The CI runs typecheck, lint, test,
and build on every PR; preview deploys go to Vercel.

```bash
vercel --prod
```

## Contributing

See `docs/ROADMAP.md` and `PLAN.md` for the open work. Major changes should
land with tests and a docs update. Run `npm run lint && npm run typecheck &&
npm test` before pushing.

## License

MIT — see `LICENSE`.
