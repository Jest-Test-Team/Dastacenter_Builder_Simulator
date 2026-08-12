# Phases P37–P44 — knowledge graph, chain, ZK, and the demo path

Covers everything after `docs/PHASE-P28-36.md`. Written to be read by someone who was not
here: each phase records what was built, what was *learned*, and what is still open.

---

## P37 — Knowledge graph pipeline ✅

**Built.** `src/lib/kg/`: `extract` → `fuse` → `gate` → `digest` → `serve`, with an ontology
and an explain layer.

The digest is the load-bearing part: it is a canonical SHA-256 over the **fused** graph, which
is what the ZK commitment binds to. It must be computed the same way in the browser and on any
verifier, or a commitment nobody can reproduce is published.

**Tests.** `tests/integration/kg-pipeline.test.ts` (36), `kg-competency`,
`kg-score-consistency`, plus `kg-digest`, `kg-extract`, `kg-fuse`, `kg-gate`, `kg-ontology`,
`kg-serve` unit suites.

**Docs.** `docs/KNOWLEDGE_GRAPH.md`, `docs/GRAPH_ENGINEERING.md`.

---

## P38 — Network / SDN modelling ✅

Spatial network topology, enterprise SDN concepts, and a multi-floor xray view of the building.

**Docs.** `docs/NETWORK_SDN.md`. **Tests.** `tests/unit/network-topology.test.ts`.

---

## P39 — SBT certificates on-chain ✅

Soulbound ERC-721 (`DatacenterCertificateSBT`), OpenZeppelin v5, Solidity 0.8.24, evmVersion
cancun. `mintCertificate` is `onlyOwner`, so the server relays the transaction and minting is
gasless for the user.

| Chain | Address |
|---|---|
| Polygon Amoy (80002) | `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB` |
| Ethereum Sepolia (11155111) | `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB` |

Same address on both — deterministic deployment, same deployer at nonce 0. Both verified live
on-chain (bytecode present) on 2026-08-11. Sepolia is the default mint chain.

This **replaced Credly** (P11). The `/api/credly` route is deleted; the certificate is now an
NFT, not a third-party badge.

**Docs.** `docs/SBT_DEPLOYMENT.md`, `docs/SBT_IMPLEMENTATION_SUMMARY.md`.
**Tests.** `sbt-server`, `sbt-client`, `sbt-abi-drift` (guards the ABI against contract drift).

---

## P40 — Compact / Midnight circuit 🟡 blocked

**Built and real.** `circuits/datacenter-score.compact` compiles with `compactc` 0.31.1
(language 0.23.0), producing proving/verifying keys and a contract artefact — all committed.
`openCommitment` is declared pure, so the commitment's security properties (determinism,
blinding, rule-pack binding) are asserted against the **real** circuit, not a TypeScript
imitation. 12 tests in `tests/integration/zk-circuit.test.ts`.

**Blocked, and this is the interesting part.** No released combination of the Compact compiler
and the Midnight proof server can prove this circuit. Established by testing:

| Attempt | Result |
|---|---|
| `MidnightProver`'s JSON `POST /prove` | Wrong protocol entirely — the server takes **binary** |
| `POST /verify` | **404. The endpoint does not exist.** Verification is local |
| rt 0.16 preimage + `ledger-v8` payload | `Unknown discriminant 109` (`m` of `midnight:`) — server wants `ProofPreimageVersioned` |
| rt 0.18-rc preimage | Same unversioned tag; not the fix |
| proof-server `2.0.7` / `3.0.7` / `4.0.0` / `latest` | All reject the unversioned form |
| `midnight-js` 4.1.1 provider → server 4.0.0 | Provider calls `/check`; 4.0.0 does not implement it (404) |
| rt 0.16 preimage + **`ledger-v9`** payload | **Accepted** — server logs `Starting to process request for /prove...` |
| …then | Never returns. 200% CPU, **34 MB RSS, 25+ min**, no result, no error. `/check` hangs too |
| `compact list` / `compact self check` | 0.31.1 is newest; tool is current. No newer compiler exists |

34 MB RSS while pinned at 200% CPU is a spin, not proving — real proving allocates hundreds of
MB. The compiler generation (runtime 0.16 / ledger-v8 era) and every published proof-server
image (ledger-v9 era) are a generation apart.

**Current behaviour.** `MidnightProver.prove()` and `.verify()` fail immediately with the
actual reason instead of issuing calls that cannot succeed. The previous code surfaced the
missing `/verify` route as a confusing "proof rejected", which is worse than an honest error.

**To unblock:** a Compact compiler targeting the v4 runtime / ledger-v9, then recompile the
circuit and regenerate keys. Worth asking the Midnight team which compiler and proof-server
tags are meant to pair.

**Docs.** `docs/MIDNIGHT_ZK.md`.

---

## P41 — Noir ZK proving ✅

**The prover the app actually uses.** Same statement as the Compact circuit, in
`circuits/noir/src/main.nr`:

> I know a facility design whose knowledge-graph digest is D, which rule pack V scored at or
> above threshold T.

| | |
|---|---|
| Proving system | Barretenberg UltraHonk over BN254 |
| Prove (warm) | ~1.4 s · ~30 s first call (WASM compile) |
| Verify | ~0.4 s |
| Proof size | 16 KB |
| `nargo` | 1.0.0-beta.20 |
| `@noir-lang/noir_js` | 1.0.0-beta.20 |
| `@aztec/bb.js` | **4.2.0** |

**Versions are pinned exactly, not caret-ranged.** bb.js and noir_js must agree on the ACIR
format — bb.js 5.x rejects beta.20 with `error converting into field Circuit::opcodes`. A
silent minor bump is exactly how P40 broke. If you upgrade one, upgrade all three and re-run
`tests/unit/noir-prover.test.ts`.

### Design decisions

- **The commitment is a public *output*, not an input.** A prover cannot publish a commitment
  that disagrees with the witness it proved about — the verifier reads the value the circuit
  derived. `verify()` additionally checks the statement against the proof's own public inputs,
  so a valid proof shipped beside a lying statement fails.
- **The digest is carried as two 128-bit halves.** It is a 256-bit SHA-256 output and BN254's
  field is 254 bits. Truncating would silently weaken the binding.
- **`pedersen_hash`, not Poseidon2.** `Poseidon2` is private in Noir beta.20's stdlib.

### Threshold scale fix

`DEFAULT_THRESHOLD` is 85 and the witness now carries `report.score`, the **0–100** rating.
Previously it carried `competitionScore`, which is **0–1000** — so "score ≥ 85" was cleared by
any scoring build by a factor of ten. The claim was true but vacuous. The `Witness` field was
renamed `competitionScore` → `score` to make the scale unambiguous.

### Runtime constraints

bb.js ships multi-megabyte WASM and needs Node:

- both libraries and the circuit load **lazily**, inside the call — a static import drags the
  WASM into the edge bundle and breaks the Cloudflare build (this exact failure mode was hit
  once in P42);
- they are listed in `serverExternalPackages` in `next.config.js`. Without it Next rewrites the
  `.wasm` to a `/_next/static/...` asset URL and the loader fails server-side with
  `Failed to parse URL from /_next/static/media/noirc_abi_wasm_bg.*.wasm`;
- **real proving cannot run on Cloudflare Workers.** `/api/zk/prove` needs a Node host.

### Verification

`tests/unit/noir-prover.test.ts` runs the real prover with **no stubs** — the one suite that
must not be faked, since everything else in the ZK path is tested against the forgeable mock.
It asserts a proof verifies, the score and digest never reach the public statement, blinding
makes the same build commit differently, and four attacks fail: below-threshold, inflated
threshold claim, swapped rule pack, tampered proof bytes.

**Docs.** `docs/NOIR_ZK.md`.

---

## P42 — CI recovery ✅

CI failed on **every** run from `#1876` (2026-07-05) through `#1880` (2026-08-10). Lint is the
first gate, so four further failures were hidden behind it — each only discoverable after
fixing the one before.

1. **Lint.** `midnight-prover.ts` suppressed `@typescript-eslint/no-var-requires`, but the rule
   that fires is `no-require-imports`. The suppression never applied.
2. **Snapshot drift.** `score-integrity` disagreed with the engine: commit `382709b7` had
   replaced the hardcoded `overall >= 60` certification bar with a configurable threshold
   defaulting to **40**, flipping a score-59 build to certifiable. The guard was doing its job.
   The threshold is also read from the environment at module load, so snapshots silently
   encoded whatever the recording machine had — now pinned in `vitest.config.ts` so the guard
   catches drift instead of *being* drift.
3. **Build.** `src/lib/zk/client.ts` runs in the browser but imported `witnessFromBuild` from
   the `./index` barrel, which re-exports `MidnightProver` — pulling the Compact runtime's WASM
   into the client bundle. Split into `./witness`; the barrel still re-exports, so the public
   API is unchanged.
4. **jsdom + Node 20.** `crypto.subtle.digest` rejected buffers via a cross-realm `instanceof`.
   Node 24+ relaxed the check, so it passed locally and failed only on CI. Shimmed in
   `tests/setup.ts` rather than bending `src/` around a test-environment quirk.
5. **Linux.** `cacheDir` was hardcoded to macOS-only `/private/tmp` → `EACCES: mkdir '/private'`
   on the runner. Now `os.tmpdir()`.

**Lesson worth keeping:** a green local run proved nothing here. Two of the five failures were
environment-specific (Node version, OS), so the fix loop was "reproduce on Node 20.20.2 first".

---

## P43 — KSN intro sequence ✅

`src/components/intro/KsnIntro.tsx`, gated by `IntroGate.tsx`. Three beats on one clock:
particle network → collapse into a server cabinet whose plaintext telemetry is enveloped by a
shield and redacted to commitments → `ENTER SIMULATOR` punches the camera through the rack.

Skippable by button or `Esc`, plays once per session, `?intro=1` replays it (for recording),
`?intro=0` suppresses it, and it degrades to a static poster under `prefers-reduced-motion`.
Lazy-loaded so three/drei stay out of the landing bundle.

**Two R3F bugs worth remembering**, both invisible in code review:

- The shield never drew because it declared `visible={false}` in JSX *and* set `.visible`
  imperatively in the frame loop. The typewriter re-renders the tree every 26 ms, so R3F
  reapplied `visible={false}` faster than frames could undo it. Visibility now rides on
  material alpha.
- The shield rendered fully transparent because the uniforms object passed to the JSX prop was
  not the one bound to the material. Uniforms are now written through the material's own ref.

---

## P44 — Demo presentation path ✅

| Component | Purpose |
|---|---|
| `cert/ZkProvingConsole.tsx` | Terminal overlay during proof + mint |
| `cert/PlanetaryDividend.tsx` | KSN settlement-agent entitlement preview |
| `zk/client.ts` `onStage` | Stage reporter driving the console |
| `result/[buildId]/page.tsx` | `PRIVATE DATA · LOCAL ONLY` marker on the local score |

Every console line is emitted by the **real** flow — the graph digest, threshold, rule pack,
token ID and transaction hash are actual values. Amber lines mark what never left the browser.
A scripted console in a privacy demo is precisely the thing a reviewer should distrust, so this
one is not scripted.

The dividend panel is explicitly labelled a **projection**: no transfer is made and it says so.
A token figure beside the user's own wallet reads as money received, so a test asserts the
disclaimer cannot be tidied away.

Certificates at Platinum are titled **"Elite Green Architect SBT"**; the machine-readable
`Level` attribute is deliberately untouched so the dividend rate card still works.

---

## Cross-cutting: honesty guarantees

Added after noticing that `ZK_ALLOW_MOCK=true` let a simulated proof present as a real one:

- the proving console prints `MOCK PROVER — proof is simulated and forgeable, not
  cryptographic` in red, and names the backend (`noir` / `midnight`) when real;
- certificate metadata drops "proven in zero knowledge" for a mock proof and carries a
  machine-readable `Proof Backend` attribute.

The metadata document is published to a public chain **forever**, so the claim in it has to be
true. Both are covered by tests so they cannot regress silently.
