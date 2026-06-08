# Phase P28–P36: UX Polish, Demo Builds, and Quality

> Completed. Covers demo builds, certificate verification, onboarding,
> enhanced help/credits, E2E tests, bundle optimization, lint cleanup,
> and documentation updates.

## P28 — 3 Demo Seeded Builds (shareable)

**Files:** `src/lib/demos/index.ts`, `src/app/demos/page.tsx`

Three pre-built data center configurations that showcase the simulator:

| Demo | Scenario | Blocks | Tier | PUE | Difficulty |
|------|----------|--------|------|-----|------------|
| Greenfield Tier III | `greenfield` | 40 | III | ~1.4 | Intermediate |
| Edge Micro-DC | `edge` | 23 | III | ≤ 1.3 | Easy |
| Tier IV Retrofit | `retrofit` | 60 | IV | ~1.25 | Expert |

Each demo is a full `BuildSnapshot` with voxels, inventory, and policy
toggles. The `/demos` page lets users load a demo into the builder or
copy a shareable URL.

## P29 — Cert Verifier Page (`/verify`)

**File:** `src/app/verify/page.tsx`

Accepts `?id=<buildId>` or `?id=<shareToken>` or cert ID format
`DCB-XXXXXX-XXXX`. Looks up the build in IndexedDB, decodes share
tokens, or searches by prefix. Shows verification status, score,
tier, level, and the rendered certificate SVG.

## P30 — Onboarding Overlay

**Files:** `src/components/onboarding/OnboardingOverlay.tsx`, `src/app/providers.tsx`

Multi-step walkthrough shown on first visit. 5 steps covering:
- Welcome and overview
- Engineering rules and scoring
- Security and policy controls
- Simulation mode
- Certificate and Credly

State persisted in `localStorage` (`dcb_onboarding_seen`). Wired into
the root `Providers` component so it appears on all pages.

## P31 — Enhanced Credits Page

**File:** `src/app/credits/page.tsx`

Organized by category (Framework, 3D Rendering, State Management,
Styling, Wallet Auth, Validation, Persistence, Certificate, Auth,
Testing, Quality, Analytics). Each entry shows name, license, and
link. Added "Standards Referenced" section with links to standards
bodies.

## P32 — Enhanced Help/FAQ Page

**File:** `src/app/help/page.tsx`

- Quick-link cards: Start building, Demo builds, Curriculum, Verify cert
- Keyboard shortcuts reference
- 10 FAQ items as expandable `<details>` elements
- Troubleshooting section (builds disappeared, wallet won't connect,
  score seems wrong, certificate not verifiable)
- Links to demos, curriculum, credits

## P33 — E2E Smoke Test (Playwright)

**Files:** `playwright.config.ts`, `e2e/smoke.spec.ts`

Playwright config with Chromium project and dev server auto-start.
Smoke tests cover:
- Landing page loads with title and CTAs
- Demos page shows 3 demo cards
- Help page shows shortcuts and FAQ
- Credits page shows categories
- Verify page shows empty state
- Scenarios, settings, about, pricing, contact pages load
- Onboarding overlay shows and dismisses
- Builder page loads with free scenario

Run with `npm run test:e2e` or `npx playwright test`.

## P34 — Bundle Optimization

**File:** `next.config.js`

Added `optimizePackageImports` for `lucide-react` and `@react-three/drei`
(already present). Added `optimizeModules` config for React runtime
memoization. Existing dynamic imports for heavy components
(BuilderCanvas, SimulationCanvas) already split the 3D engine.

## P35 — Lint Cleanup (0 warnings)

**Files:** Multiple (see diff)

Fixed all ESLint warnings:
- `consistent-type-imports`: 4 API routes + providers + qrcode.react.d.ts
- `no-unused-vars`: cert page, help page, demos page, analytics, scoring engine, scoring rules, build store, PlacementPreview
- `prefer-const`: build store `cellsForBlock`, PlacementPreview

Final state: `✔ No ESLint warnings or errors`

## P36 — Documentation Updates

**Files:** `docs/PHASE-P28-36.md`, `docs/STATUS.md`, `docs/ROADMAP.md`

- Created this phase document
- Updated STATUS.md with P28–P36 progress
- Updated ROADMAP.md to mark completed items
- Updated PLAN.md to reference P28–P36
