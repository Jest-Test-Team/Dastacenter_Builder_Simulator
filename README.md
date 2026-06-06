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

Open `http://localhost:3000` → click **Free build** → drag blocks from the
left palette into the 3D grid. Press <kbd>1–9</kbd> to switch the hotbar slot,
<kbd>R</kbd> to rotate, right-click to place, <kbd>Esc</kbd> to cancel.

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC + client) |
| 3D | React Three Fiber + drei + three.js |
| State | Zustand + zundo (temporal) |
| Wallet | wagmi (EVM: MetaMask, WalletConnect, Coinbase, Phantom-EVM) + Solana adapters |
| Auth | SIWE (EVM) + custom SIWS (Solana) via iron-session httpOnly cookies |
| Persistence | IndexedDB (idb-keyval) — fully client-side |
| Sharing | LZ-string-encoded snapshot in URL |
| Scoring | Pure functions, fully deterministic (no Date.now/Random in core) |
| Cert | SVG, generated client-side; QR via `qrcode.react` |
| Credly | Server route only (Basic Auth) — opt-in, never in client bundle |
| Tests | Vitest + Testing Library (jsdom) |
| Styling | Tailwind + CSS variables (no UI framework) |
| i18n | `next-intl` (en, zh-TW, ja in MVP) |

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
│  └─ api/
│     ├─ auth/{nonce,verify,session,logout}/
│     └─ credly/issue/
├─ components/
│  ├─ builder/                   # BuilderCanvas, VoxelWorld, palette, hotbar, modes
│  ├─ policy/                    # PolicyPanel (deterrence + 5-function + ESG)
│  ├─ wallet/                    # WalletPicker
│  └─ cert/                      # CertificateSvg
├─ lib/
│  ├─ grid/                      # Voxel grid utilities (Cell, AABB, neighbors)
│  ├─ blocks/                    # Block types, registry (~40 blocks, 7 categories)
│  ├─ store/                     # Zustand build store
│  ├─ scoring/                   # engine + ~60 rules + policy plane
│  ├─ persist/                   # IndexedDB + share token
│  ├─ wallet/                    # wagmi, solana, siwe, siws, iron-session
│  ├─ credly/                    # Server-side REST client
│  ├─ content/                   # Learning modules
│  └─ utils/                     # classnames, shortAddress, identity
└─ styles/                       # tailwind globals
tests/
└─ unit/                         # grid, scoring, registry, share, siwe, siws
docs/
├─ STATUS.md                     # live phase progress
├─ ARCHITECTURE.md               # system diagrams
├─ MVP.md                        # 1,520-todo MVP cut
├─ SECURITY.md                   # threat model + headers
├─ ROADMAP.md                    # post-launch milestones
└─ PHASE-P{0..24}.md             # one page per phase
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | `tsc --noEmit` (strict, noUncheckedIndexedAccess) |
| `npm run test` | Vitest (jsdom) |
| `npm run test:watch` | Vitest watch |
| `npm run test:coverage` | Vitest + v8 coverage |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run analyze` | `next build` with bundle analyzer |

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

See `src/lib/scoring/rules/index.ts` for the full per-rule citations.

## Privacy & data

The app is **pure-frontend**. Builds are stored in your browser's IndexedDB.
Wallet signatures are the only server interaction, used to prove ownership
of the certificate being claimed. **No emails, no tracking pixels, no
server-side analytics by default.** See `docs/SECURITY.md` for the full
threat model.

## Contributing

See `docs/ROADMAP.md` and `PLAN.md` for the open work. Major changes should
land with tests and a docs update. Run `npm run lint && npm run typecheck &&
npm test` before pushing.

## License

MIT — see `LICENSE`.
