# Changelog

Notable changes, newest first. Current state lives in [`docs/STATUS.md`](docs/STATUS.md);
this file records *what changed and why*, so a decision can be traced back later.

Dates are the commit dates. Commit hashes are on `main`.

---

## 2026-08-12 — Real zero-knowledge proofs

### `605d533c` — feat(zk): real zero-knowledge proofs via Noir + Barretenberg

The app now produces genuine ZK proofs. Measured through `/api/zk/prove`: **~1.4 s to prove
warm, ~0.4 s to verify, 16 KB proofs.**

- **Added** `circuits/noir/src/main.nr` and `src/lib/zk/noir-prover.ts`. Same statement the
  Compact circuit made: "I know a design whose graph digest is D, which rule pack V scored at
  or above threshold T."
- **Changed** `getProver()` order to Midnight (if configured) → **Noir** → mock. Noir is the
  default because it works.
- **Fixed** the threshold scale, which had made the claim vacuous: the witness now carries
  `report.score` (0–100) rather than `competitionScore` (0–1000), so `score >= 85` is a bar
  with real margin instead of one every scoring build cleared tenfold. `Witness.competitionScore`
  renamed to `Witness.score`.
- **Changed** `MidnightProver` to fail immediately with the actual reason instead of issuing
  calls that cannot succeed — its `/verify` endpoint does not exist and 404s, which previously
  surfaced as a confusing "proof rejected".

Design notes worth keeping:

- The commitment is a **public output** of the circuit, not an input, so a prover cannot
  publish a commitment that disagrees with the witness it proved about.
- The 256-bit digest is carried as **two 128-bit halves**, not truncated into BN254's 254-bit
  field.
- Versions are **pinned exactly, not caret-ranged**: bb.js and noir_js must agree on the ACIR
  format (bb.js 5.x rejects beta.20 with `error converting into field Circuit::opcodes`).

**Tests:** `tests/unit/noir-prover.test.ts` runs the real prover with no stubs, asserting four
attacks fail — below-threshold, inflated threshold, swapped rule pack, tampered bytes.

---

## 2026-08-12 — Honesty about which prover ran

### `cd1d2906` — fix(zk): never present a mock proof as a real one

Investigating whether the real Midnight prover could replace the mock established that it
cannot (see below), and that the mock was being reported as though it were cryptographic —
including in permanent on-chain metadata.

- **Changed** the proving console to print `MOCK PROVER — proof is simulated and forgeable,
  not cryptographic` in red, and to name the backend when a real proof was produced. The two
  cases previously rendered identically, so nothing on screen told a viewer which one ran.
- **Changed** certificate metadata to stop asserting "proven in zero knowledge" for a mock
  proof, with a machine-readable `Proof Backend` attribute alongside. That document is
  published to a public chain forever, so the claim in it has to be true.

---

## 2026-08-11 — Demo presentation path

### `2e62b80f` — feat(cert): "Elite Green Architect SBT"

Top-level (Platinum) certificates take the marketed name. The machine-readable `Level`
attribute is deliberately untouched so the dividend rate card still works. Applies to future
mints only.

### `f7fb62a0` — feat(demo): proving console, private-data marker, dividend preview

- **Added** `ZkProvingConsole` — a terminal overlay during proof + mint. Every line is emitted
  by the real flow via a new `onStage` reporter on `acquireThresholdProof`; the digest,
  threshold, rule pack, token ID and tx hash are actual values. A scripted console in a privacy
  demo is exactly what a reviewer should distrust.
- **Added** `PRIVATE DATA · LOCAL ONLY` marker on the local score.
- **Added** `PlanetaryDividend` — explicitly labelled a **projection**; no transfer is made and
  it says so. A test asserts the disclaimer so it cannot be tidied away.
- **Changed** the mint CTA to "Mint Privacy SBT via Midnight".

### `98a5e10f` — config: allow the mock prover in the deployed environment

Without it `getProver()` refuses the mock in production and `/api/zk/prove` answers 503, which
broke the live demo at the proof step. A demo affordance, not a security posture — superseded
in practice by the Noir prover.

---

## 2026-08-11 — CI recovery

CI had failed on **every** run from `#1876` (2026-07-05) to `#1880` (2026-08-10). Lint is the
first gate, so four further failures were invisible behind it.

### `c0db4b15` — feat(intro) + fix CI cache path — **first green run**

- **Added** the KSN R3F intro sequence (`src/components/intro/`). Skippable, once per session,
  `?intro=1` replays it, degrades to a static poster under reduced motion, lazy-loaded.
- **Fixed** `vitest` `cacheDir`, hardcoded to macOS-only `/private/tmp`, which killed the Linux
  runner with `EACCES: mkdir '/private'`.

Two R3F bugs found here, both invisible in code review: the shield never drew because
`visible={false}` was declared in JSX *and* set imperatively in the frame loop (the typewriter
re-renders every 26 ms, faster than frames could undo it); and it rendered fully transparent
because the uniforms object passed as a prop was not the one bound to the material.

### `79a253ba` — fix(test): WebCrypto digest under jsdom on Node 20

`crypto.subtle.digest` rejected buffers via a cross-realm `instanceof`. Node 24+ relaxed the
check, so it passed locally and failed only on CI. Shimmed in `tests/setup.ts` rather than
bending `src/` around a test-environment quirk.

### `dae08f61` — fix(ci): lint suppression, snapshot drift, client bundle

1. **Lint** — the suppression named `no-var-requires`, but the rule that fires is
   `no-require-imports`, so it never applied.
2. **Snapshot drift** — `score-integrity` disagreed with the engine: `382709b7` had replaced
   the hardcoded `overall >= 60` certification bar with a configurable threshold defaulting to
   **40**, flipping a score-59 build to certifiable. The guard was doing its job. The threshold
   was also read from ambient env at module load, so snapshots encoded whatever the recording
   machine had — now pinned in `vitest.config.ts`.
3. **Build** — `src/lib/zk/client.ts` runs in the browser but imported from the `./index`
   barrel, which re-exports `MidnightProver`, pulling the Compact runtime's WASM into the
   client bundle. Split into `./witness`.

---

## Findings that are not code changes

### Midnight proving is blocked upstream (2026-08-11/12)

Established by testing, not by reading documentation. Full evidence in `docs/MIDNIGHT_ZK.md`.

- `MidnightProver` targeted an API that does not exist: the real server takes **binary**
  payloads on `POST /prove` and exposes **no `/verify`** endpoint (404).
- `/prove` requires `ProofPreimageVersioned`. Compact **0.31.1** — the newest released
  compiler — pins runtime **0.16.0**, which emits the unversioned form. Server images `2.0.7`,
  `3.0.7`, `4.0.0` and `latest` all reject it.
- Framing with `ledger-v9` **is** accepted, but then never returns: 200% CPU at **34 MB RSS for
  25+ minutes**, no result, no error. `/check`, which only validates, hangs too. That memory
  profile is a spin, not proving.
- No newer compiler exists (`compact list` tops out at 0.31.1; the tool reports itself current).

**Consequence:** the Compact circuit, keys and `openCommitment` remain real and compile, but no
released combination can prove them. Reopens when Midnight ships a compiler targeting the v4
runtime / ledger-v9.

---

## Known constraints

- **Real proving needs a Node host.** `bb.js` ships WASM that cannot run in the Cloudflare
  Workers runtime. On Workers `getProver()` falls through to the mock, which is refused in
  production unless `ZK_ALLOW_MOCK=true`. Moving `/api/zk/prove` to a Node host is the open
  item that separates "we have real ZK" from "the deployed site has real ZK".
- **The deployed site is behind `main`** until `npm run deploy` is run.
