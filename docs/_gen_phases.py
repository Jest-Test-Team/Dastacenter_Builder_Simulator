"""Generate the 24 remaining PHASE-P{n}.md files from a template."""

PHASES = {
    1: ("Grid + block system", "P0", "P2", "Cell/GridSize/AABB/neighbors/inBounds/manhattan/chebyshev in lib/grid. Block types, instances, port/rule schemas in lib/blocks. ~40-block registry across 7 categories.", "Cell is a 3-int tuple. GridSize is w/h/d (legacy: 32×8×32). AABB is the bounding-box helper used by all collision and adjacency checks."),
    2: ("3D builder (R3F)", "P1", "P3", "BuilderCanvas (R3F Canvas, OrbitControls, lighting), VoxelWorld (InstancedMesh per block type for 60fps with thousands of blocks), PlacementPreview (raycast ghost), SiteEnvironment (ground + skybox).", "Frameloop='demand' by default — only re-renders on state change. DPR auto-detected. One InstancedMesh per type keeps draw calls in single digits."),
    3: ("Palette / hotbar / modes", "P2", "P4", "BlockPalette (category tabs + search + 2-col grid + inventory), Hotbar (9 slots, 1–9 keys), ModeBar (build/sim/inspect + undo/redo/save/finish).", "Inventory is shared between palette and hotbar; the hotbar auto-picks-up the most-recently selected palette block."),
    4: ("Build store + utils", "P3", "P5", "Zustand build store with zundo temporal middleware. `placeBlock`/`removeBlock`/`rotateBlock` actions. `lib/utils` (cn, shortAddress, buildIdFromSnapshot).", "State is plain data; UI lives in the same store for ergonomics. Zundo keeps a 50-step history."),
    5: ("Wallet auth (no email)", "P4", "P6", "wagmi config (mainnet, sepolia, base, optimism, arbitrum; MetaMask, WalletConnect, Coinbase). Solana adapters (Phantom, Solflare). SIWE via the `siwe` package. Custom SIWS via tweetnacl + bs58. Iron-session 12-h httpOnly cookies. /api/auth/{nonce,verify,session,logout}.", "Server-side nonce store is in-memory in v1; production should move to Upstash. Wallet address is the only identity. There is no `User` record in any database."),
    6: ("Persistence + sharing", "P5", "P7", "idb-keyval stores (builds, settings, progress). useAutoSave (1.5s debounce). encodeBuildToShareToken (LZ-string + base64). decodeShareToken. buildShareUrl.", "The share token is the same data the IDB store holds — both are LZ-compressed JSON. The token never expires (the snapshot is its own authority)."),
    7: ("Scoring engine", "P6", "P8", "engine.ts (pure function `score(state) → RatingReport`). policy.ts (50+ keys in 10 groups). rules/index.ts (~60 rules: UPTIME, TIA, EN50, ASHRAE, NFPA, POWER, COOL, ESG, SEC, PRIV, ISO27).", "Engine is 100% pure: no Date.now, no Math.random, no IO. The same input always produces the same report — this is what makes the certificate meaningful."),
    8: ("Curriculum content", "P7", "P9", "8 learning modules in `lib/content/modules.ts`: site-selection, uptime-tiers, power-distribution, cooling-architecture, fire-protection, security-framework, esg-efficiency, network-sdn. Each has learning objectives, lessons, standards, and an optional scenarioId.", "Modules are data; the reader UI was added in v1.1. The 8 modules cover ~5 hours of content."),
    9: ("Result/scorecard UI", "P8", "P10", "`/result/[buildId]` with scorecard, per-axis bars, issue list (sorted by severity), achievements, and a CTA to the cert page.", "The page re-runs `score(state)` on the client; it must be deterministic with the cert engine. Both pages share `lib/scoring`."),
    10: ("Cert (SVG + QR)", "P9", "P11", "CertificateSvg component (gradients, watermark, gold seal, QR via qrcode.react). `/cert/[buildId]` with download-as-SVG and an opt-in 'Publish to Credly' button.", "SVG is built with React JSX, never innerHTML. The QR code points to a verifier route that re-runs the score."),
    11: ("Credly integration", "P10", "P12", "Server-only lib/credly/server.ts (Basic Auth, never in the client bundle). /api/credly/issue route. Template id mapping (Bronze/Silver/Gold/Platinum).", "The route requires session + score ≥ 40 + opt-in checkbox. Env vars: CREDLY_API_TOKEN, CREDLY_ORG_ID, CREDLY_TEMPLATE_{LEVEL}."),
    12: ("SimCity-like simulation", "P11", "P13", "`/sim/[buildId]` with NPCs (deterministic walk), event log, power/temp gauges, play/pause/speed controls. Reuses the same build state.", "Player does not intervene in sim — it's the 'watch your design operate' mode. Sim randomness is non-deterministic on purpose; the score is not affected."),
    13: ("Policy panel UI", "P12", "P14", "PolicyPanel right-side drawer with focus trap, ARIA dialog semantics, and 10 collapsible groups (3 deterrence + 5 security functions + privacy + ESG).", "Each toggle feeds the scoring engine alongside the 3D blocks. The same `PolicyState` shape is used by sim and by the cert."),
    14: ("Security viz", "P13", "P15", "CctvCoverage (cone geometry per CCTV block, visible only in `inspect` mode). SecurityFrameworkPanel (live coverage % per security group).", "Coverage is a 45° half-angle cone at 12m range; configurable per-camera in v1.1."),
    15: ("Unit tests", "P14", "P16", "Vitest + jsdom. 30+ tests across grid, scoring, registry, share, SIWS, perf budget. `npm test` and `npm run test:coverage` wired in CI.", "The scoring engine is the most-tested piece because it is the certificate's authority."),
    16: ("Performance budget", "P15", "P17", "Dynamic imports for R3F, three, wallet adapters. Bundle analyzer. `tests/unit/perf.test.ts` (registry < 100, rules < 200, 200-block score < 100ms). WebVitalsReporter → /api/vitals. CSP, HSTS, X-Frame, Referrer-Policy, Permissions-Policy headers.", "Target: < 250 kB initial, < 1.5 MB total. Lighthouse Performance ≥ 90."),
    17: ("Accessibility", "P16", "P18", "SkipLink, FocusTrap hook, ReducedMotion hook, KeyboardCheatsheet (?), ARIA on PolicyPanel (role=dialog, aria-modal, aria-labelledby). `id='main'` on every page.", "WCAG 2.2 AA target. The cheatsheet is the lowest-cost way to teach new users the shortcuts."),
    18: ("i18n (en/zh-TW/ja)", "P17", "P19", "Custom in-house i18n in `lib/i18n` (next-intl skipped to avoid a router refactor). LocaleSwitcher in the header. Server-side detection from cookie + Accept-Language.", "3 locales: en (default), zh-TW, ja. Adding a locale is one new JSON file + one entry in LOCALES."),
    19: ("Analytics with consent", "P18", "P20", "ConsentBanner, useConsent (zustand+persist). trackEvent. PageViewTracker. PostHog lazy-loaded only if user opts in AND a key is configured. No third-party scripts by default.", "We never run analytics without explicit consent. The /api/vitals endpoint is our own; PostHog is opt-in."),
    20: ("Docs", "P19", "P21", "This file. README, ARCHITECTURE, MVP, SECURITY, ROADMAP, STATUS, and one PHASE-P{n}.md per phase. Updated continuously.", "Docs are part of the product, not an afterthought."),
    21: ("DevOps (CI, deploy)", "P20", "P22", "GitHub Actions CI: typecheck, lint, test, build, bundle-size check. Vercel preview deploys on PR. Security headers via next.config.js. Health endpoint /api/health.", "PR-blocking checks: typecheck + lint + tests. Bundle-size check is a warning until we have a baseline."),
    22: ("Marketing site", "P21", "P23", "Landing (already in P0), Pricing, Status, About, Contact. SEO metadata, OG image, sitemap, robots.txt.", "Pricing tiers: Free (1 save, all standards cited), Pro (cloud sync, 100 saves), Enterprise (on-prem)."),
    23: ("Legal/compliance", "P22", "P24", "ToS, Privacy, Cookie policy, DPA template, AI policy, Acceptable Use, Data Processing Addendum. Generated in /legal/* routes. Reviewed by counsel before public.", "All legal docs are templates; final sign-off requires a licensed attorney."),
    24: ("Launch checklist", "P23", "—", "24h pre-flight, DNS warm-up, social cards, support email, status page, on-call rotation, rollback plan, post-launch retrospective.", "Once checked, the checklist is archived to `docs/INCIDENTS/launch-YYYY-MM-DD.md`."),
}

template = """# Phase {n} — {title}

## Goal
{goal}

## Files added
{files}

## Key decisions
{decisions}

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase {next_n}](./PHASE-P{next_n}.md)
"""

for n, (title, prev, nxt, files, dec) in sorted(PHASES.items()):
    out = template.format(n=n, title=title, goal=PHASES[n][1] and '', files=files, decisions=dec, next_n=n+1)
    # we use a simpler static template below
