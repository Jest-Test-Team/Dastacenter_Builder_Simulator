"""Generate the 24 remaining PHASE-P{n}.md files (P1..P24)."""
from pathlib import Path

PHASES = {
    1: ("Grid + block system", "P0", "P2",
        "`lib/grid/index.ts` (Cell, GridSize, AABB, neighbors, inBounds, manhattan, chebyshev); `lib/blocks/{types,registry,index}.ts` (~40 block defs across 7 categories with port/rule/standards metadata).",
        "Cell is a 3-int tuple. GridSize is w/h/d. AABB is the bounding-box helper used by every collision and adjacency check. The registry is a frozen array; adding a block is one entry."),
    2: ("3D builder (R3F)", "P1", "P3",
        "`components/builder/{BuilderCanvas,VoxelWorld,SiteEnvironment,PlacementPreview}.tsx`. R3F + drei + three.",
        "Frameloop='demand' by default — only re-renders on state change. DPR auto-detected. One InstancedMesh per block type keeps draw calls in single digits even with thousands of voxels."),
    3: ("Palette / hotbar / modes", "P2", "P4",
        "`components/builder/{BlockPalette,Hotbar,ModeBar}.tsx`.",
        "Inventory is shared between palette and hotbar. The hotbar auto-picks the most-recently-selected palette block. ModeBar has 3 modes: build, sim, inspect."),
    4: ("Build store + utils", "P3", "P5",
        "`lib/store/build-store.ts` (Zustand + zundo). `lib/utils/{index,identity}.ts` (cn, shortAddress, buildIdFromSnapshot).",
        "State is plain data; UI lives in the same store for ergonomics. Zundo keeps a 50-step history. `loadBuild` is atomic and clears undo."),
    5: ("Wallet auth (no email)", "P4", "P6",
        "`lib/wallet/{wagmi,solana,siwe,siws,session}.ts`. `app/api/auth/{nonce,verify,session,logout}/route.ts`. `app/api/auth/nonce-store.ts`.",
        "Server-side nonce store is in-memory in v1; production should move to Upstash. Wallet address is the only identity. There is no `User` record in any database."),
    6: ("Persistence + sharing", "P5", "P7",
        "`lib/persist/{index,share}.ts` (idb-keyval + LZ-string). useAutoSave, useSaveBuild, useLoadBuild, useSettings.",
        "The share token and the IDB record hold the same data. The token never expires (the snapshot is its own authority)."),
    7: ("Scoring engine", "P6", "P8",
        "`lib/scoring/{engine,policy,index}.ts`. `lib/scoring/rules/index.ts` (~60 rules: UPTIME, TIA, EN50, ASHRAE, NFPA, POWER, COOL, ESG, SEC, PRIV, ISO27).",
        "Engine is 100% pure: no Date.now, no Math.random, no IO. The same input always produces the same report — this is what makes the certificate meaningful."),
    8: ("Curriculum content", "P7", "P9",
        "`lib/content/modules.ts` (8 modules: site-selection, uptime-tiers, power-distribution, cooling-architecture, fire-protection, security-framework, esg-efficiency, network-sdn).",
        "Modules are data. Each has learning objectives, lessons, standards, and an optional scenarioId. The reader UI was added in P22."),
    9: ("Result/scorecard UI", "P8", "P10",
        "`app/result/[buildId]/page.tsx`. Scorecard + per-axis bars + issue list + achievements + cert CTA.",
        "The page re-runs `score(state)` on the client. It must be byte-identical to the cert engine's output."),
    10: ("Cert (SVG + QR)", "P9", "P11",
        "`components/cert/CertificateSvg.tsx`. `app/cert/[buildId]/page.tsx`.",
        "SVG is built with React JSX, never innerHTML. The QR code points to a verifier route that re-runs the score from the embedded snapshot."),
    11: ("Credly integration", "P10", "P12",
        "`lib/credly/server.ts` (server-only, Basic Auth). `app/api/credly/issue/route.ts`.",
        "Route requires session + score ≥ 40 + opt-in. Env vars: CREDLY_API_TOKEN, CREDLY_ORG_ID, CREDLY_TEMPLATE_{LEVEL}."),
    12: ("SimCity-like simulation", "P11", "P13",
        "`app/sim/[buildId]/page.tsx` (NPCs, events, gauges, controls).",
        "Player does not intervene in sim — it's the 'watch your design operate' mode. Sim randomness is non-deterministic on purpose; the score is not affected."),
    13: ("Policy panel UI", "P12", "P14",
        "`components/policy/PolicyPanel.tsx` (drawer with focus trap, ARIA dialog, 10 groups).",
        "Each toggle feeds the scoring engine alongside the 3D blocks. The same `PolicyState` is used by sim and by the cert."),
    14: ("Security viz", "P13", "P15",
        "`components/builder/CctvCoverage.tsx` (cones, inspect-mode only). `components/builder/SecurityFrameworkPanel.tsx` (live coverage %).",
        "Coverage is a 45° half-angle cone at 12m range; configurable per-camera in v1.1. The dashboard computes % on the client from the same PolicyState the engine uses."),
    15: ("Unit tests", "P14", "P16",
        "Vitest + jsdom. 30+ tests across grid, scoring, registry, share, SIWS, perf budget. `npm test` and `npm run test:coverage` wired in CI.",
        "The scoring engine is the most-tested piece because it is the certificate's authority."),
    16: ("Performance budget", "P15", "P17",
        "Dynamic imports for R3F, three, wallet adapters. Bundle analyzer. `tests/unit/perf.test.ts`. `components/perf/WebVitalsReporter.tsx`. `app/api/vitals/route.ts`. CSP/HSTS/etc headers in `next.config.js`.",
        "Targets: < 250 kB initial, < 1.5 MB total. Lighthouse Performance ≥ 90. Bundle size is enforced via a CI warning, not a hard block."),
    17: ("Accessibility", "P16", "P18",
        "`components/a11y/{SkipLink,KeyboardCheatsheet}.tsx`. `lib/hooks/{useFocusTrap,useReducedMotion}.ts`. ARIA on PolicyPanel. `id='main'` on every page.",
        "WCAG 2.2 AA target. The cheatsheet is the lowest-cost way to teach new users the shortcuts."),
    18: ("i18n (en/zh-TW/ja)", "P17", "P19",
        "`lib/i18n/{index,server}.ts`. `lib/i18n/messages/{en,zh-TW,ja}.json`. `components/i18n/LocaleSwitcher.tsx`.",
        "We chose an in-house i18n over next-intl to avoid a router refactor. Adding a locale is one new JSON file + one entry in `LOCALES`."),
    19: ("Analytics with consent", "P18", "P20",
        "`lib/analytics/index.tsx` (consent store, trackEvent, PageViewTracker). `components/analytics/ConsentBanner.tsx`.",
        "We never run analytics without explicit consent. The /api/vitals endpoint is our own; PostHog is opt-in and lazy-loaded."),
    20: ("Docs", "P19", "P21",
        "This file. README, ARCHITECTURE, MVP, SECURITY, ROADMAP, STATUS, and one PHASE-P{n}.md per phase. Updated continuously.",
        "Docs are part of the product, not an afterthought. The CI action fails if a phase file is missing."),
    21: ("DevOps (CI, deploy)", "P20", "P22",
        "`.github/workflows/ci.yml` (typecheck, lint, test, build, bundle-size). Vercel preview deploys. `app/api/health/route.ts`.",
        "PR-blocking checks: typecheck + lint + tests. Bundle-size check is a warning until we have a baseline."),
    22: ("Marketing site", "P21", "P23",
        "`app/{pricing,status,about,contact}/page.tsx`. SEO metadata, OG image, sitemap, robots.",
        "Pricing tiers: Free (1 save, all standards cited), Pro (cloud sync, 100 saves), Enterprise (on-prem)."),
    23: ("Legal/compliance", "P22", "P24",
        "`app/{legal/terms,legal/privacy,legal/cookies,legal/dpa,legal/ai}/page.tsx`. Reviewed by counsel before public.",
        "All legal docs are templates; final sign-off requires a licensed attorney."),
    24: ("Launch checklist", "P23", "—",
        "`docs/LAUNCH.md` (24h pre-flight, DNS warm-up, social cards, support email, status page, on-call rotation, rollback plan, post-launch retrospective).",
        "Once checked, the checklist is archived to `docs/INCIDENTS/launch-YYYY-MM-DD.md`."),
}

template = """# Phase {n} — {title}

## Goal
Deliver the {title_lower} work so the rest of the product can build on it.

## Files added
{files}

## Key decisions
{decisions}

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase {next_n}](./PHASE-P{next_n}.md)
"""

out_dir = Path("docs")
for n, (title, prev, nxt, files, dec) in sorted(PHASES.items()):
    p = out_dir / f"PHASE-P{n}.md"
    body = template.format(
        n=n,
        title=title,
        title_lower=title.lower(),
        files=files,
        decisions=dec,
        next_n=n + 1 if n < 24 else 0,
    )
    p.write_text(body)
    print("wrote", p)
