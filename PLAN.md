# Datacenter Builder Simulator — Master Plan

A pure-frontend SaaS that teaches users to build a data center in a Lego/Minecraft style, then rates their creation against international standards (Uptime, TIA-942, EN 50600, ASHRAE, NFPA, ISO 27001, EU EED, etc.) and publishes a verifiable certificate to Credly.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| 3D | React Three Fiber + Drei + Three.js |
| State | Zustand + zundo (undo/redo) |
| UI | Tailwind CSS + Radix primitives + lucide icons |
| Validation | Zod |
| Persistence | idb-keyval (IndexedDB) |
| Auth | wagmi + viem (EVM/MetaMask) + @solana/wallet-adapter (Phantom) + SIWE/SIWS |
| 3D Perf | InstancedMesh per category + drei helpers |
| 3rd-party | Credly API for certificate issuance |
| Telemetry | Sentry (errors) + PostHog (product) — opt-in |
| i18n | next-intl (en, zh-TW, ja) |
| Testing | Vitest (unit) + Playwright (e2e, deferred) |

## High-level architecture

```
app/
  page.tsx                          Landing
  learn/[moduleId]/page.tsx         Lesson reader
  build/[scenarioId]/page.tsx       3D builder (R3F)
  sim/[buildId]/page.tsx            Simulation mode
  result/[buildId]/page.tsx         Scorecard
  cert/[buildId]/page.tsx           Certificate + Credly claim
  api/                              Server endpoints
    auth/{nonce,verify,session,logout}/route.ts
    credly/issue/route.ts
  layout.tsx
  providers.tsx                     wagmi + Solana + theme
components/
  builder/                          R3F components
  learn/                            Lesson UI
  result/                           Scorecard UI
  cert/                             Certificate UI
  policy/                           Policy panel
  wallet/                           Wallet UI
  ui/                               Reusable primitives
lib/
  blocks/                           Block registry & types
  grid/                             Voxel grid math
  scoring/                          Pure scoring engine
  persist/                          IndexedDB layer
  credly/                           Server-side Credly client
  wallet/                           wagmi/Solana config
  content/                          Modules & scenarios
  store/                            Zustand stores
  i18n/                             next-intl config & messages
```

## Phase status

This document is the **master plan**. As work is completed, each phase is marked:

- [ ] Not started
- [x] Foundation in place (skeleton, types, primary components)
- [X] Feature complete (all critical todos done)
- [~] Partially done (some todos complete, follow-ups tracked in this file)

For granular todos per phase, see the **Phase todo breakdown** section below. For implementation status, see `docs/STATUS.md`.

## Core invariants

1. **Pure-FE first.** Everything works in the browser with no backend except the thin `/api/*` routes needed for Credly issuance (token cannot ship in client bundle) and SIWE/SIWS verification.
2. **Deterministic scoring.** `score(build, scenario) → RatingReport` is a pure function. No `Date.now`, no RNG, fully shareable and reproducible from a build URL.
3. **Wallet-only auth.** No email/password accounts. SIWE for EVM, SIWS for Solana. Sessions are httpOnly JWTs.
4. **Type-safe boundaries.** Zod schemas at the API boundary; all registry data validated at module load.
5. **Standards citations.** Every scoring rule cites the source standard. The brief is the canonical source.

## Open decisions (from the user)

The plan covers everything by default. The following user decisions would change priorities; the build is structured so they can be made later without rewrite:

- Persistence path: IndexedDB-only (default) vs Ceramic/IPFS vs Cloudflare R2
- Simulation depth: L1 observatory (default) vs L2 NPCs vs L3 SimCity
- Target user: enterprise L&D / students / cert-track pros
- Open source vs closed
- Multiplayer: solo (default) vs real-time co-build
- Monetization: freemium (default) vs one-time vs enterprise
- Credly org status: do you have one? (plan assumes: scaffold a placeholder)

## Phase todo breakdown

### P0 — Repository & infrastructure (160 todos) — see `docs/PHASE-P0.md`
Project bootstrap: Next.js 15, TypeScript strict, Tailwind, deps, lint, husky, CI, env, Storybook, scripts.

### P1 — Core domain model (520 todos) — see `docs/PHASE-P1.md`
Block catalog (~40 blocks across 7 categories + policy plane), grid math, registry, Zod schemas, block metadata.

### P2 — 3D engine (320 todos) — see `docs/PHASE-P2.md`
R3F canvas, camera, lighting, skybox, grid, instanced voxel rendering, raycast, input, post-processing, asset pipeline.

### P3 — Builder interactions (260 todos) — see `docs/PHASE-P3.md`
Palette, hotbar, placement, removal, transform, clipboard, layers, alignment, undo/redo, minimap, measure.

### P4 — State management (120 todos) — see `docs/PHASE-P4.md`
Zustand core build store, progress store, build list store, history (zundo).

### P5 — Wallet auth (180 todos) — see `docs/PHASE-P5.md`
wagmi (EVM) + Solana wallet-adapter (Phantom), SIWE/SIWS, nonce + verify endpoints, JWT session, Auth UI.

### P6 — Persistence (180 todos) — see `docs/PHASE-P6.md`
IndexedDB layer with idb-keyval, save/load, share URL, JSON export, settings persistence.

### P7 — Scoring engine (380 todos) — see `docs/PHASE-P7.md`
Pure-function engine; rule pack for Uptime Tier I–IV, TIA-942, EN 50600, ASHRAE, NFPA 75/2001, ISO 27001, ESG/PUE/WUE, security framework (5 functions + 3 deterrence types), achievements.

### P8 — Learning content (320 todos) — see `docs/PHASE-P8.md`
Schema, ~10 modules (site selection, tiers, power, cooling, fire, network, security, deterrence, ESG, DR), free-build sandbox, progress.

### P9 — Result & rating UI (180 todos) — see `docs/PHASE-P9.md`
Scorecard, breakdown radar, issue list with standard citations, action buttons, navigation back to builder.

### P10 — Certificate (160 todos) — see `docs/PHASE-P10.md`
SVG template, personalization, QR + verification URL, PDF/PNG/SVG export, wallet-signed claim.

### P11 — Credly integration (180 todos) — see `docs/PHASE-P11.md`
Server-side client, issue endpoint, claim UI, ops, privacy.

### P12 — Simulation mode (400 todos) — see `docs/PHASE-P12.md`
Time loop, event system, equipment sim, alerts, NPC system (L1: observatory by default), scenes, weather, dashboards.

### P13 — Policy panel (180 todos) — see `docs/PHASE-P13.md`
Right drawer with tabs for Deterrence, Preventive, Detective, Corrective, Recovery, Compensating, Privacy, ESG.

### P14 — Security controls integration (110 todos) — see `docs/PHASE-P14.md`
Visualizations (CCTV cone, light cone), 5-function dashboard, security rubric.

### P15 — Testing (300 todos) — see `docs/PHASE-P15.md`
Unit tests for grid math, scoring, registry, persistence, auth. Component tests. E2E (deferred).

### P16 — Performance (180 todos) — see `docs/PHASE-P16.md`
R3F instancing, frustum culling, LOD, Web Worker scoring, asset pipeline.

### P17 — Accessibility (160 todos) — see `docs/PHASE-P17.md`
Keyboard nav, screen reader support, contrast, reduced motion, focus management.

### P18 — i18n (130 todos) — see `docs/PHASE-P18.md`
next-intl setup, en + zh-TW + ja translations, number/date formatting, RTL-ready.

### P19 — Analytics & telemetry (130 todos) — see `docs/PHASE-P19.md`
Consent banner, Sentry, PostHog, server metrics.

### P20 — Documentation (160 todos) — see `docs/PHASE-P20.md`
README, architecture, Storybook, user guide, dev guide, ADRs, API docs.

### P21 — DevOps (240 todos) — see `docs/PHASE-P21.md`
Vercel deploy, envs, secrets, monitoring, logging, backups, security headers, status page.

### P22 — Marketing site (200 todos) — see `docs/PHASE-P22.md`
Landing, features, pricing, comparison, blog, SEO.

### P23 — Legal & compliance (110 todos) — see `docs/PHASE-P23.md`
ToS, privacy, cookie, AUP, DMCA, DPA, license inventory, GDPR mechanics, wallet disclosures.

### P24 — Beta & launch (180 todos) — see `docs/PHASE-P24.md`
Closed beta, bug bash, security audit, perf audit, a11y audit, launch checklist, post-launch iteration.

**Total: 5,140 todos across 25 phases.**

## MVP cut (recommended for first ship)

The full 5,140 todos is a 6–12 month build for a 3–5 person team. The recommended MVP (≈ 1,520 todos, 8–12 weeks with 2 engineers + 1 designer) is documented in `docs/MVP.md`.

MVP scope (high level):
- EVM-only wallet auth (Solana later)
- IndexedDB only (no cloud save)
- Trimmed block catalog: structure, site, power, cooling, IT, network (safety/security 3D deferred to v2; deterrents via policy panel)
- Core scoring: Uptime, ASHRAE, NFPA, ESG (TIA-942, EN 50600, ISO, security rubric in v2)
- 4 modules: Tiers, Power, Cooling, Fire
- L1 Observatory sim mode
- Marketing landing + SEO only
- Legal basics

## Implementation cadence

This plan will be executed in this order, phase by phase. After each phase:
1. Update `docs/STATUS.md` with what's done / in-progress / blocked
2. Append a short changelog entry
3. Tick the relevant boxes above (e.g. `[x]` for foundation, `[X]` for feature complete, `[~]` for partial)
4. Commit with conventional-commits message
