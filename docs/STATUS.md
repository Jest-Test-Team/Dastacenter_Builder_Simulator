# Project status

> Authoritative progress tracker. Last verified **2026-08-12** against commit `605d533c`
> by running the full pipeline, not by reading code.
>
> - `PLAN.md` — master plan · `docs/ROADMAP.md` — product sequencing
> - `docs/PHASE-P{n}.md` — per-phase detail · `docs/LAUNCH.md` — operational checklist

## At a glance

| | |
|---|---|
| **Pipeline** | ✅ green — lint, typecheck, 396 tests, 13 workerd tests, production build |
| **CI** | ✅ 6 consecutive green runs (was failing on *every* run for ~5 weeks until 2026-08-11) |
| **ZK proofs** | ✅ **real** — Noir + Barretenberg UltraHonk, 1.4 s prove / 0.4 s verify |
| **SBT contracts** | ✅ live on Polygon Amoy + Ethereum Sepolia, bytecode verified on-chain |
| **Deployed site** | ⚠️ behind `main` — needs `npm run deploy`; real proving needs a Node host |
| **Blocking for demo** | Record locally (`npm run dev`); Cloudflare falls back to the mock prover |

## Verified numbers

Measured on 2026-08-12, Node 20.20.2 (the version CI pins):

| Metric | Value |
|---|---|
| Unit + integration tests | **396 passing**, 32 files |
| Workers (workerd) tests | **13 passing**, 1 file |
| E2E (Playwright) | 21 specs across 2 files (`smoke`, `graph`) |
| Page routes | 26 |
| API routes | 11 |
| React components | 32 |
| Lib modules | 22 |
| Block types | 47 |
| Scoring rules | 37 unique rule IDs across 8 axes |
| Docs | 43 markdown files |
| Lint | clean — no warnings, no errors |
| Typecheck | clean (`strict`, `noUncheckedIndexedAccess`) |

## Phase progress

### Core product (P0–P36) — complete

| Phase   | Title                    | Status  | Notes |
| ------- | ------------------------ | ------- | ----- |
| **P0**  | Project bootstrap        | ✅ done | Next 15 + TS strict + Tailwind + ESLint + Prettier |
| **P1**  | Grid + block system      | ✅ done | Grid, registry, validated hot-loaded block plugins |
| **P2**  | 3D builder (R3F)         | ✅ done | `BuilderCanvas`, `VoxelWorld` (instanced), `PlacementPreview` |
| **P3**  | Palette / hotbar / modes | ✅ done | `BlockPalette`, `Hotbar`, `ModeBar` |
| **P4**  | Build store + utils      | ✅ done | Zustand + zundo |
| **P5**  | Wallet auth (no email)   | ✅ done | wagmi + solana + SIWE/SIWS + iron-session |
| **P6**  | Persistence + sharing    | ✅ done | idb-keyval + LZ-string share tokens |
| **P7**  | Scoring engine           | ✅ done | 37 rules, 8 axes, deterministic |
| **P8**  | Curriculum content       | ✅ done | 8 modules |
| **P9**  | Result/scorecard UI      | ✅ done | `/result/[buildId]` |
| **P10** | Cert (SVG + QR)          | ✅ done | `/cert/[buildId]` + `CertificateSvg` |
| **P11** | ~~Credly integration~~   | ⛔ removed | Superseded by on-chain SBT (P39). Route deleted |
| **P12** | SimCity-like simulation  | ✅ done | NPCs, events, gauges, L2 staffing/OPEX/carbon/water |
| **P13** | Policy panel UI          | ✅ done | `PolicyPanel` |
| **P14** | Security viz             | ✅ done | `CctvCoverage`, `SecurityFrameworkPanel` |
| **P15** | Unit tests               | ✅ done | Superseded by the far larger suite below |
| **P16** | Performance budget       | ✅ done | Dynamic imports, `WebVitalsReporter`, CSP/HSTS |
| **P17** | Accessibility            | ✅ done | SkipLink, focus trap, reduced motion, ARIA |
| **P18** | i18n (en/zh-TW/ja)       | ✅ done | In-house i18n + `LocaleSwitcher` |
| **P19** | Analytics with consent   | ✅ done | `ConsentBanner`, opt-in PostHog |
| **P20** | Docs (per-phase)         | ✅ done | `docs/PHASE-P{0..24}.md` |
| **P21** | DevOps (CI, deploy)      | ✅ done | GitHub Actions + Cloudflare (OpenNext) |
| **P22** | Marketing site           | ✅ done | `/pricing`, `/about`, `/status`, `/contact` |
| **P23** | Legal/compliance         | ✅ done | ToS, Privacy, Cookies, DPA, AI policy |
| **P24** | Launch checklist         | ✅ done | `docs/LAUNCH.md` |
| **P28–P36** | Demos, verifier, onboarding, credits, help, E2E, bundle, lint, docs | ✅ done | `docs/PHASE-P28-36.md` |

### Knowledge graph, chain and ZK (P37–P44)

| Phase   | Title                      | Status  | Notes |
| ------- | -------------------------- | ------- | ----- |
| **P37** | Knowledge graph pipeline   | ✅ done | extract → fuse → gate → digest → serve. `docs/KNOWLEDGE_GRAPH.md` |
| **P38** | Network / SDN modelling    | ✅ done | Spatial topology + multi-floor xray. `docs/NETWORK_SDN.md` |
| **P39** | SBT certificates on-chain  | ✅ done | Soulbound ERC-721, gasless relay mint. `docs/SBT_DEPLOYMENT.md` |
| **P40** | Compact / Midnight circuit | 🟡 blocked | Circuit written + compiled + 12 tests. **Cannot be proven** — see below |
| **P41** | **Noir ZK proving**        | ✅ done | Real proofs, 1.4 s. `docs/NOIR_ZK.md` |
| **P42** | CI recovery                | ✅ done | 5 stacked failures fixed; green since `c0db4b15` |
| **P43** | KSN intro sequence         | ✅ done | R3F particle → shield → punch-through. `src/components/intro/` |
| **P44** | Demo presentation path     | ✅ done | Proving console, private-data marker, dividend preview |

Legend: ✅ done · 🟡 partial/blocked · ⛔ removed · ⏳ pending

## P40 — why the Midnight path is blocked

Established by testing on 2026-08-11/12, not by reading documentation. Full evidence in
`docs/MIDNIGHT_ZK.md`.

1. `MidnightProver` was written against an API that does not exist. The real proof server
   takes **binary** payloads on `POST /prove` and exposes **no `/verify` endpoint** (404).
2. `/prove` requires the preimage wrapped as `ProofPreimageVersioned`. Compact **0.31.1** —
   the newest released compiler, and the one that built `circuits/build` — pins runtime
   **0.16.0**, which emits the older unversioned form. Proof-server images `2.0.7`, `3.0.7`,
   `4.0.0` and `latest` all reject it with `Unknown discriminant 109`.
3. Framing the same preimage with `ledger-v9` **is** accepted — the server logs
   `Starting to process request for /prove...` — but never returns. On 8 CPUs it held 200% CPU
   at **34 MB RSS for 25+ minutes** with no result and no error. `/check`, which only
   validates, hangs too. That memory profile is a spin, not proving.
4. No newer compiler exists: `compact list` tops out at 0.31.1 and `compact self check`
   reports the tool current.

**Consequence:** the circuit, its keys and `openCommitment` are real and still compile, but no
released combination can prove it. `MidnightProver` now fails immediately with the actual
reason instead of issuing calls that cannot succeed. The path reopens when Midnight ships a
compiler targeting the v4 runtime / ledger-v9.

## P41 — the ZK stack that does work

| | |
|---|---|
| Circuit | `circuits/noir/src/main.nr` |
| Proving system | Barretenberg UltraHonk over BN254 |
| Prove (warm) | **~1.4 s** (~30 s first call, compiling WASM) |
| Verify | **~0.4 s** |
| Proof size | 16 KB |
| Toolchain | `nargo` 1.0.0-beta.20 · `noir_js` 1.0.0-beta.20 · `bb.js` **4.2.0** |

Versions are **pinned exactly, not caret-ranged**: bb.js and noir_js must agree on the ACIR
format (bb.js 5.x rejects beta.20 with `error converting into field Circuit::opcodes`). A
silent minor bump of either is precisely how the Midnight path broke.

Two design properties worth preserving:

- The commitment is a **public output** of the circuit, not an input, so a prover cannot
  publish a commitment that disagrees with the witness it proved about. `verify()` also checks
  the statement against the proof's own public inputs.
- The 256-bit digest is carried as **two 128-bit halves**, not truncated into BN254's 254-bit
  field. Truncation would quietly weaken the binding.

`tests/unit/noir-prover.test.ts` runs the real prover with no stubs and asserts four attacks
fail: below-threshold, inflated threshold claim, swapped rule pack, tampered proof bytes.

## P42 — CI recovery

CI had failed on **every** run from `#1876` (2026-07-05) to `#1880` (2026-08-10). Lint is the
first gate, so four further failures were invisible behind it. Each was only discoverable after
fixing the one before:

| # | Gate | Fault |
|---|---|---|
| 1 | Lint | Suppression named `no-var-requires`; the rule that fires is `no-require-imports` |
| 2 | Test | Score-integrity snapshot vs engine: the cert bar had been silently lowered 60 → 40, and the threshold was read from ambient env so snapshots encoded the recording machine |
| 3 | Build | `lib/zk/client.ts` (browser) imported the barrel, which re-exports `MidnightProver`, pulling the Compact runtime's WASM into the client bundle |
| 4 | Test | `crypto.subtle` cross-realm rejection under jsdom on Node 20 (Node 24+ is lenient — hence local-green/CI-red) |
| 5 | Test | `cacheDir` hardcoded to macOS-only `/private/tmp` → `EACCES` on Linux |

Guards added so these cannot silently return: the cert threshold is pinned in `vitest.config.ts`,
and `tests/setup.ts` documents the jsdom realm shim.

## Deployment state

| Environment | State |
|---|---|
| `main` | ✅ green, 6 consecutive successful CI runs |
| Cloudflare (`datacenter-building-simulator.dennisleehappy.org`) | ⚠️ **behind `main`** — last deploy predates P41–P44 |
| SBT — Polygon Amoy (80002) | ✅ `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB` |
| SBT — Ethereum Sepolia (11155111) | ✅ same address; default mint chain |

**Known constraint:** `bb.js` ships WASM that cannot run in the Cloudflare Workers runtime, so
`/api/zk/prove` needs a **Node host** to prove for real. On Workers, `getProver()` falls
through to `MockProver`, which is refused in production unless `ZK_ALLOW_MOCK=true` (currently
set in `wrangler.jsonc`). Both libraries load lazily and are listed in
`serverExternalPackages`; a static import breaks the edge build.

## Honesty guarantees

A mock proof must never read as a real one. Enforced in two places and covered by tests:

- the proving console prints `MOCK PROVER — proof is simulated and forgeable` in red, and names
  Noir when a genuine proof was produced;
- certificate metadata drops the "proven in zero knowledge" wording for a mock proof and
  carries a machine-readable `Proof Backend` attribute. That document is published to a public
  chain forever, so the claim in it has to be true.

## Open items

**Repository work**

- [ ] Move `/api/zk/prove` to a Node host so the live site proves for real (currently mock on Cloudflare)
- [ ] Deploy P41–P44 to production (`npm run deploy`)
- [ ] Optional: prove client-side in the browser — bb.js supports it, and the witness would then never leave the machine at all
- [ ] Multiplayer co-build (Yjs), opt-in encrypted cloud sync, Stripe billing
- [ ] WCAG 2.2 AA audit fixes, mobile-first touch controls

**Cosmetic / demo**

- [ ] `/verify` heading reads "Your NFT certificates"; demo script says "My Certificates"
- [ ] Result page stat card shows the 0–1000 competition score while the proof is about the 0–100 score — both private, but say **97** on camera

**External (cannot be closed from this repo)**

- [ ] Legal review, penetration test, accessibility audit sign-off
- [ ] Production domain hardening (DNSSEC/CAA, TLS preload, CDN rules)
- [ ] Sentry / PostHog / status-page projects, support inboxes, on-call rotation
- [ ] Production Lighthouse run and wallet matrix smoke test

## Changelog — 2026-08-11/12 session

| Commit | Change |
|---|---|
| `dae08f61` | CI unblocked: lint suppression, snapshot drift, client bundle leak |
| `79a253ba` | WebCrypto digest under jsdom on Node 20 |
| `c0db4b15` | KSN intro sequence; vitest cacheDir portability — **first green CI** |
| `98a5e10f` | `ZK_ALLOW_MOCK` for the deployed environment |
| `f7fb62a0` | Proving console, private-data marker, dividend preview |
| `2e62b80f` | "Elite Green Architect SBT" for Platinum |
| `cd1d2906` | Mock proofs can no longer pass as real (console + on-chain metadata) |
| `605d533c` | **Real ZK proofs via Noir + Barretenberg**; threshold scale fix |
