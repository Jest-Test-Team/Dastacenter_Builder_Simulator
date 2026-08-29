<div align="center">

# Datacenter Builder Simulator

### Build a data center like Lego. Get graded against real international standards. Prove you passed — without ever revealing the design.

[![Live Demo](https://img.shields.io/badge/Live-datacenter--building--simulator-2ea44f?style=for-the-badge)](https://datacenter-building-simulator.dennisleehappy.org/)
[![Demo Video](https://img.shields.io/badge/▶_Demo_Video-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/HEeLKUdFxDI)
![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Next.js 15 · React Three Fiber · Noir + Barretenberg · Midnight Compact · Soulbound Tokens**

</div>

---

## ▶ Demo video

**https://youtu.be/HEeLKUdFxDI**

[![Watch the demo](https://img.youtube.com/vi/HEeLKUdFxDI/maxresdefault.jpg)](https://youtu.be/HEeLKUdFxDI)

**Live app:** https://datacenter-building-simulator.dennisleehappy.org/

---

## The problem

A data center's real PUE, cooling architecture and physical layout are
**commercial secrets**. But every certification scheme on earth asks the operator
to hand exactly those numbers to an auditor in order to earn a badge.

> You have to reveal the thing in order to prove something about the thing.

This project removes that trade-off. You design a facility in a 3D voxel builder,
it is scored deterministically against 13 real standards, and then a
**zero-knowledge proof** publishes the *verdict* — never the *design*.

| Public — what the world sees | Private — what never leaves your machine |
|---|---|
| A blinded commitment to your design | The design: layout, rack counts, cooling topology, every asset and edge |
| The rule pack version that judged it | The exact score — only that it cleared the bar |
| The threshold cleared (default **85**) | The PUE, the WUE, the knowledge-graph digest |

The proof is generated **in your browser** (Noir + Barretenberg UltraHonk, ~1.4 s),
and the resulting certificate is minted as a **Soulbound Token** on-chain.

---

## Try it in 3 minutes

| # | Do this | You should see |
|---|---|---|
| 1 | Open the [live app](https://datacenter-building-simulator.dennisleehappy.org/) → **Build** | A 32×8×32 voxel grid and a 47-block palette |
| 2 | Drag blocks in. Press <kbd>1</kbd>–<kbd>9</kbd> for the hotbar, <kbd>R</kbd> to rotate, <kbd>?</kbd> for the cheat sheet | Blocks snapping into the grid |
| 3 | Hit **Simulate** | NPCs walking the floor, live power/thermal gauges |
| 4 | Hit **Score** | Six axis scores, an Uptime tier (I–IV), cited rule violations |
| 5 | Connect a wallet → **Certificate** | A real ZK proof generated locally (~1.4 s), then an SBT mint |

No email. No password. No account. Wallet-only, and everything is stored in your
own browser.

---

## What it does

### 1. Build — a 3D voxel data center

A **32 × 8 × 32** grid, **47 block types** across structure, site, power, cooling,
IT, safety and network. Per-block-type `InstancedMesh` keeps the draw call count
in single digits even with thousands of voxels.

<img width="1634" alt="Building scene" src="https://github.com/user-attachments/assets/dd6a882f-eac6-4ea9-8132-0d7ae0d867fe" />

### 2. Simulate — SimCity for facilities

The same build state renders as a live simulation: NPCs walk the floor, scheduled
events fire, power and temperature gauges oscillate, and deterministic L2
projections cover staffing, OPEX, carbon and water.

<img width="1541" alt="Simulation scene" src="https://github.com/user-attachments/assets/41950145-cc78-4fe4-be33-0e0dda3d1b33" />

### 3. Score — 37 rules, every one citing a real standard

Six axes roll into one overall score:

```
S = 0.20·redundancy + 0.20·power + 0.15·cooling
  + 0.15·safety     + 0.15·efficiency + 0.15·security
```

…plus an Uptime tier (I–IV or F) and a cert level (Bronze → Platinum). The engine
is **pure** — no `Date.now()`, no `Math.random()` anywhere in the core — because a
proof about a score is worthless if two runs over the same build disagree.

<img width="1634" alt="Rating scene" src="https://github.com/user-attachments/assets/8cf5305f-08bd-4dea-88a6-b5ab35df0681" />

### 4. Prove — zero knowledge, in the browser

The build is compiled into a knowledge graph → digested → fed to a Noir circuit
that proves **one sentence and nothing more**.

### 5. Mint — a Soulbound certificate

A client-side SVG certificate with a QR code, minted as a non-transferable
ERC-721 on Polygon / Ethereum / BSC / Base / Arbitrum / Optimism — or as a Compact
contract call on Midnight Preview.

<img width="1244" alt="SBT certificate" src="https://github.com/user-attachments/assets/d7b4ed50-70c0-489b-9f9c-5504e2f396ec" />
<img width="1070" alt="SBT on-chain" src="https://github.com/user-attachments/assets/154b0eca-e8f7-48fd-9051-2e7951a56631" />
<img width="1072" alt="Certificate metadata" src="https://github.com/user-attachments/assets/e2b243f2-1128-4bb1-9340-5a00501fa02e" />

<details>
<summary>More screenshots — download flow (wallet required)</summary>

<img width="732" alt="Download" src="https://github.com/user-attachments/assets/bbbde663-67cc-48e2-8955-ed45223ad555" />
<img width="363" alt="Download confirm" src="https://github.com/user-attachments/assets/7ca15404-9c2e-4e18-ab32-853311e26708" />
<img width="698" alt="Certificate preview" src="https://github.com/user-attachments/assets/da3d2c18-549e-42fd-8511-c8a100e9ac0a" />
<img width="572" alt="SBT card" src="https://github.com/user-attachments/assets/7613bdcc-b8f6-4612-bf86-7ccc4e6de556" />

</details>

---

## The zero-knowledge proof

`circuits/noir/src/main.nr` proves exactly:

> *I know a facility design whose knowledge-graph digest is **D**, which rule pack
> **V** scored at or above threshold **T**.*

```
C = pedersen(D_hi, D_lo, r_hi, r_lo, V, DOMAIN)     // public output
assert(score >= T)                                   // the whole claim
```

Three decisions in that circuit, each of which was wrong on the first attempt:

- **The commitment `C` is a public *output*, not an input.** If the prover supplies
  it, they can publish a commitment that has nothing to do with the witness they
  proved about. As an output, the verifier reads the value the circuit derived.
- **The rule pack `V` is inside the hash.** Without binding it, a proof made under
  a lax pack replays as though it had cleared a strict one.
- **The 256-bit SHA-256 digest is split into two 128-bit halves**, because BN254's
  field holds only 254 bits. Truncating would have "worked" and silently weakened
  the binding — the worst class of bug, because nothing fails.

The blinding `r` matters too: without it, anyone holding a guess at your design
can confirm it by recomputing the hash.

### Measured (M-series laptop)

| | |
|---|---|
| Execute witness | ~90 ms |
| Generate proof | **~1.4 s** warm (~30 s first call, compiling WASM) |
| Verify | ~0.4 s |
| Proof size | 16 KB |

### Where it runs

Proving happens **in the browser** (`src/lib/zk/browser-prover.ts`). On Cloudflare
Workers bb.js's WASM has no filesystem to read `acvm_js_bg.wasm` from, so the
server route 502s there — but in the browser both libraries load their WASM as
designed, *and the design never leaves the machine at all*. Only the finished
proof, carrying nothing but the public statement, is sent on to mint.

### What is deliberately **not** proven

The circuit does not verify that the score was computed honestly, or that the
digest describes a well-formed build. It cannot — re-running 37 rules inside a
circuit would mean ingesting the whole private build, which defeats the purpose.
Those properties are attested by the scoring service that produces the witness.
This boundary is stated here rather than left for a reader to discover.

### Honesty guarantees

A mock proof must never read as a real one:

- `MockProver` is **refused in production** unless `ZK_ALLOW_MOCK=true`;
- the proving console prints `MOCK PROVER — proof is simulated and forgeable` in
  red, and names Noir when a genuine proof was produced;
- certificate metadata drops the "proven in zero knowledge" wording for a mock
  proof and carries a machine-readable `Proof Backend` attribute.

That document goes on a public chain forever, so the claim in it has to be true.

**Attack tests, against the real prover with no stubs** — `tests/unit/noir-prover.test.ts`
asserts four separate forgeries fail: a below-threshold build, an inflated
threshold claim, a swapped rule pack, and tampered proof bytes.

📄 Full write-up: [`docs/NOIR_ZK.md`](docs/NOIR_ZK.md)

---

## Midnight

The project was built on **Midnight first**, and the Compact circuit is real,
compiles, and is still in the repo — `circuits/datacenter-score.compact`.

**What works today:** the circuit compiles with `compactc` 0.31.1 (language
0.23.0); prover/verifier keys are generated (~2.8 MB each) for both
`proveThreshold` and `mintCertificate`; 12 integration tests run against the
**real compiled circuit**; Lace wallet connects via `window.midnight` and reads
the unshielded NIGHT balance; and a headless smoke test confirms the SDK, the
keys and `httpClientProofProvider` all construct a working `proveTx` against a
running proof server.

**What blocked a live mint:** a version-generation gap between Midnight's own
public releases. Compact 0.31.1 — the newest released compiler — pins runtime
0.16.0, which emits the *unversioned* proof preimage that proof-server images
2.0.7 / 3.0.7 / 4.0.0 / latest all reject with `Unknown discriminant 109`. Framing
it with `ledger-v9`'s `createProvingPayload` *is* accepted, then spins forever
(200% CPU, 34 MB RSS, 25+ minutes, no result, no error). Re-tested 2026-08-14
against proof-server **7.0.0-rc.1**, two of three blockers were gone — the
remaining step needs a funded Preview wallet.

Two things worth saying out loud:

- **`disclose()` is the best language design decision in this space.** Leaking data
  becomes an act you must deliberately type out, so auditing my own circuit was a
  grep, not a dataflow analysis.
- **Nothing is ever fabricated.** Neither the browser path nor the CLI pretends a
  transaction happened. The mock is loudly labelled, everywhere.

📄 The full investigation, kept rather than deleted: [`docs/MIDNIGHT_ZK.md`](docs/MIDNIGHT_ZK.md)

```sh
./scripts/midnight-setup.sh check     # what's present, what's missing
./scripts/midnight-setup.sh compile   # circuits/ → circuits/build/
./scripts/midnight-setup.sh serve     # proof server on :6300 (Docker)
./scripts/midnight-setup.sh smoke     # verify SDK + keys + server, no wallet needed
```

---

## Architecture

```
BuildState ──► scoring engine (37 pure rules) ──► report {score, tier, PUE, WUE}
     │
     └──► knowledge graph: extract → fuse → gate → digest
                                              │
                          browser prover ◄────┘   (Noir + bb.js, ~1.4 s)
                                │
                                ▼
                   proof {commitment, threshold, rulePack}
                                │
                                ▼
                     /api/sbt/mint  ──verify──►  SBT on-chain
```

Minting writes a permanent public claim to a chain — the irreversible edge in this
system — so verification sits immediately before it, in `verifyMintProof`.
`tests/integration/zk-mint-gate.test.ts` drives the real route handlers: a gate
only tested one layer down is a gate nobody has actually tried.

### Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, RSC + client) |
| 3D | React Three Fiber + drei + three.js |
| State | Zustand + zundo (temporal undo/redo) |
| Wallet | wagmi (EVM) + Solana wallet adapters + Lace (Midnight) |
| Auth | SIWE (EVM) + custom SIWS (Solana), iron-session httpOnly cookies |
| Persistence | IndexedDB (idb-keyval) — fully client-side |
| Scoring | Pure functions, fully deterministic |
| ZK | Noir 1.0.0-beta.20 + `@aztec/bb.js` 4.2.0 (UltraHonk, BN254) — **pinned exactly** |
| ZK (alt) | Midnight Compact 0.31.1 / language 0.23.0 |
| Blockchain | Soulbound ERC-721 on Polygon, Ethereum, BSC, Base, Arbitrum, Optimism |
| Cert | SVG generated client-side, QR via `qrcode.react` |
| Tests | Vitest + Testing Library — **396 unit/integration + 13 workerd**, all green |
| Styling | Tailwind + CSS variables (no UI framework) |
| i18n | In-house — English, 繁體中文, 日本語 |
| Deploy | Cloudflare Workers via OpenNext (`wrangler.jsonc`) |

> ZK versions are pinned exactly, not caret-ranged. `bb.js` 5.x rejects beta.20's
> ACIR with `error converting into field Circuit::opcodes` — and a silent minor
> bump is precisely how the Midnight path broke.

---

## Quick start

```bash
git clone <this repo>
cd Dastacenter_Builder_Sinulator
npm install --legacy-peer-deps   # React 19 RC peer-dep conflict workaround
cp .env.example .env.local       # fill in SESSION_SECRET at minimum
npm run dev                      # → http://localhost:3000
```

Open `http://localhost:3000` → **Build** → drag blocks from the left palette into
the grid. <kbd>1</kbd>–<kbd>9</kbd> hotbar, <kbd>R</kbd> rotate, right-click place,
<kbd>Esc</kbd> cancel, <kbd>?</kbd> cheat sheet.

`circuits/noir/target/` is committed, so a fresh checkout can prove without
`nargo` installed. Only recompiling needs it.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server on :3000 |
| `npm run build` / `start` | Production build / run |
| `npm run lint` | Next.js + TypeScript ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm test` | Vitest — 396 tests, all green |
| `npm run test:workers` | Vitest in real workerd — 13 tests |
| `npm run zk:noir:compile` | Compile the Noir circuit (`nargo`) |
| `npm run zk:compile` | Compile the Compact circuit (`compactc`) |
| `npm run test:coverage` | Vitest + v8 coverage |
| `npm run analyze` | `next build` with bundle analyzer |
| `npm run deploy` | Build + deploy to Cloudflare Workers |

---

## Full feature list

- **3D builder** — 32×8×32 voxel grid, 47 block types, 7 categories.
- **Policy panel** — 3 deterrence categories, 5 security functions, privacy, ESG.
- **Standards-cited scoring** — 37 rules, per-axis 0–100, Uptime tier, cert level.
- **ZK threshold proofs** — real Noir proofs in the browser; the commitment is a
  public circuit *output*, so it cannot disagree with its witness.
- **Knowledge graph** — extract → fuse → gate → digest → serve; the commitment
  binds to the canonical digest of the *fused* graph, reproducible by any verifier.
- **Selective disclosure** — `openCommitment` lets an NDA'd auditor re-derive the
  commitment from a revealed digest + blinding, without the design ever being public.
- **Verifiable certificate** — client-side SVG + QR, downloadable, mintable as an SBT.
- **SimCity-like sim** — NPCs, scheduled events, live gauges, deterministic
  staffing/OPEX/carbon/water projections.
- **Security viz** — CCTV coverage cones, live 5-function framework dashboard.
- **Curriculum** — 8 modules, ~5 hours of standards-cited learning content.
- **Community block plugins** — data-only namespaced JSON manifests, validated
  locally and hot-loaded into palette, renderer, inventory and scoring.
- **Share** — LZ-string-compressed snapshot in a URL. **Autosave** — IndexedDB, 1.5 s debounce.
- **A11y** — skip link, dialog focus traps, ARIA roles, reduced-motion hook.
- **PWA-ready, no third-party trackers** — analytics is opt-in only.

### Standards cited

Uptime Institute Tier I–IV · TIA-942-C · EN 50600-1 · ASHRAE TC 9.9 (A1–A4) ·
NFPA 75/76/855 · ISO/IEC 27001:2022 · EU EED 2023/1791 Art. 12 · SG DCA DR
(Green Mark DC) · DE EnEfG (PUE ≤ 1.5 from 2025, ≤ 1.3 from 2026) · CN GB 40879
(PUE ≤ 1.3 in 2025) · SOC 2 · NIST SP 800-30 · NIST CSF 2.0

Full per-rule citations: `src/lib/scoring/rules/index.ts`.

### Performance budget

- Initial JS bundle **< 250 kB** gzipped.
- 200-block scoring run **< 100 ms** (`tests/unit/perf.test.ts`).
- Lighthouse targets: Performance ≥ 90, A11y ≥ 90, Best Practices ≥ 90, SEO ≥ 90.

---

## Deployed contracts

`DatacenterCertificateSBT` — soulbound ERC-721, OpenZeppelin v5, Solidity 0.8.24.
Deterministic deployment, so the address is identical on both chains. Bytecode
verified live on-chain 2026-08-11.

| Network | Address | Explorer |
|---|---|---|
| Polygon Amoy (80002) | `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB` | [polygonscan](https://amoy.polygonscan.com/address/0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB) |
| Ethereum Sepolia (11155111) | `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB` | [etherscan](https://sepolia.etherscan.io/address/0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB) |

Sepolia is the default mint chain. `mintCertificate` is `onlyOwner`, so the server
relays the transaction and **minting is gasless for the user**.

<details>
<summary>Deploying your own contracts + storage config</summary>

```bash
cd contracts
npm install
npm run deploy:amoy       # or deploy:polygon, deploy:sepolia, …
```

Then update `src/lib/sbt/chains.ts` and add to `.env.local`:

```bash
NEXT_PUBLIC_NFT_STORAGE_KEY=...   # free IPFS
NEXT_PUBLIC_PINATA_KEY=...        # alternative IPFS
NEXT_PUBLIC_ARWEAVE_KEY=...       # permanent storage (optional)
PRIVATE_KEY=...                   # deployer
POLYGONSCAN_API_KEY=...
```

Metadata storage cost, auto-selected by size and network:

| Storage | Size | Testnet | Mainnet |
|---|---|---|---|
| IPFS | <5 KB | Free | ~$0.001 |
| Arweave | <5 KB | N/A | ~$0.05 |
| On-chain | <5 KB | ~$0.01 | ~$0.50–5 |

See `src/lib/sbt/README.md` for the detailed deployment guide.

</details>

<details>
<summary>Env for a live Midnight Preview mint</summary>

```
NEXT_PUBLIC_MIDNIGHT_NETWORK=preview
NEXT_PUBLIC_MIDNIGHT_INDEXER_URL=...        # GraphQL https
NEXT_PUBLIC_MIDNIGHT_INDEXER_WS_URL=...     # GraphQL wss
NEXT_PUBLIC_MIDNIGHT_NODE_URL=...           # node RPC
NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL=http://localhost:6300
NEXT_PUBLIC_MIDNIGHT_CERT_CONTRACT_ADDRESS=...
```

</details>

---

## Privacy & data

The app is **pure-frontend**. Builds live in your browser's IndexedDB. Wallet
signatures mint certificates as Soulbound Tokens. **No emails, no tracking pixels,
no server-side analytics by default** — PostHog is opt-in via the consent banner.
The ZK proof is generated locally, so under a privacy claim the certificate's
`Score` attribute reads `>= 85` and the design is never disclosed at all.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the threat model.

---

## Project status & what's next

[`docs/STATUS.md`](docs/STATUS.md) is the authoritative tracker. The short version:

- ✅ Real ZK proving in production — browser-side Noir + bb.js.
- ✅ SBT contracts live on Polygon Amoy and Ethereum Sepolia.
- 🔜 **On-chain UltraHonk verifier** so the SBT contract checks the proof at mint
  time rather than trusting the minter.
- 🔜 **Reopen the Midnight path** the moment a compiler generation lands that
  targets the current proof server — the circuit is sitting in the repo waiting.
- 🔜 Deploy SBT contracts to the remaining supported chains.
- 🔜 IPFS/Arweave storage keys; leaderboard D1 binding.

---

## agent on cloudflare ai workers

The binding itself doesn't pin a specific model — it's bound to the full Workers AI catalog (project: "<catalog>"). The actual model is chosen at runtime in the Worker's code via AI.run("<model>", ...). Let me check the script content to find which model(s) it actually calls.The script is a large bundled Next.js app. Let me search within it for the AI model name programmatically.The Workers AI binding on datacenter-simulator (production) uses the model @cf/meta/llama-3.3-70b-instruct-fp8-fast.

## Documentation

| Doc | What it covers |
|---|---|
| [`docs/STATUS.md`](docs/STATUS.md) | **Authoritative progress tracker** — verified numbers, phases, open items |
| [`docs/NOIR_ZK.md`](docs/NOIR_ZK.md) | The ZK stack that ships: circuit, timings, pinned versions, attack tests |
| [`docs/MIDNIGHT_ZK.md`](docs/MIDNIGHT_ZK.md) | The Compact circuit, and exactly where the toolchain generations fail to line up |
| [`docs/KNOWLEDGE_GRAPH.md`](docs/KNOWLEDGE_GRAPH.md) | Graph pipeline and canonical digest |
| [`docs/SBT_DEPLOYMENT.md`](docs/SBT_DEPLOYMENT.md) | Contract deployment and minting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System diagram and data flow |
| [`docs/NETWORK_SDN.md`](docs/NETWORK_SDN.md) | Facility hierarchy, topology, SDN overlays, failure simulation |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Product sequencing |

## Contributing

See [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`PLAN.md`](PLAN.md) for open work.
Major changes should land with tests and a docs update. Run
`npm run lint && npm run typecheck && npm test` before pushing. CI
(`.github/workflows/ci.yml`) runs typecheck, lint, test and build on every PR.

## License

MIT.
