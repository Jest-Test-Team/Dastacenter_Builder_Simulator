# Architecture

## System diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (pure FE)                      │
│                                                             │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  R3F Canvas  │  │  Zustand store │  │  React UI      │  │
│  │  (instanced  │◀▶│  + zundo       │◀▶│  (palette,     │  │
│  │  meshes)     │  │  temporal      │  │   hotbar,      │  │
│  │              │  │                │  │   policy,      │  │
│  └──────────────┘  └────────┬───────┘  │   scorecard)   │  │
│                             │          └────────────────┘  │
│                             ▼                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Build state (voxels map, byCell index, policies)   │    │
│  └─────┬────────────────────────────┬─────────────────┘    │
│        │                            │                       │
│        ▼                            ▼                       │
│  ┌──────────────┐          ┌────────────────────┐           │
│  │  Scoring     │          │  IndexedDB         │           │
│  │  engine      │          │  (idb-keyval)      │           │
│  │  (pure)      │          │                    │           │
│  └──────┬───────┘          └────────┬───────────┘           │
│         │                           │                       │
│         ▼                           ▼                       │
│  ┌──────────────┐          ┌────────────────────┐           │
│  │  Cert SVG    │          │  LZ-string share   │           │
│  │  + QR        │          │  token (URL)       │           │
│  └──────────────┘          └────────────────────┘           │
│                                                             │
│  ┌──────────────┐                                          │
│  │  Wagmi/Sol   │  wallet adapter                          │
│  └──────┬───────┘                                          │
│         │ EIP-4361 / custom SIWS                            │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTPS (signed message)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Server routes                         │
│                                                             │
│  /api/auth/nonce     → mints nonce, sets cookie             │
│  /api/auth/verify    → verifies SIWE/SIWS, sets session     │
│  /api/auth/session   → returns current session              │
│  /api/auth/logout    → clears session                       │
│                                                             │
│  /api/zk/prove       → witness → ZK proof   (Node runtime)  │
│  /api/zk/verify      → proof → one bit                      │
│  /api/sbt/mint       → verifies proof, then relays the mint │
│                        (signer key never in the client)     │
│                                                             │
│  /api/leaderboard/{top,submit}  /api/health  /api/vitals    │
└─────────────────────────────────────────────────────────────┘
```

## Zero-knowledge layer

```
browser                                    server (Node)
───────                                    ─────────────
BuildState
   │ buildKnowledgeGraph()
   ▼
fused graph ──► graphDigest()  ─┐
   │                            │  witness = { graphDigest, score, blinding }
score(state) ──► report.score ──┤        (never persisted, never logged)
                                │
   random blinding ─────────────┘
                                 │  POST /api/zk/prove
                                 ▼
                          Noir circuit executes
                          assert(score >= threshold)
                          commitment = pedersen(digest, blinding, pack, domain)
                                 │
                          Barretenberg UltraHonk
                                 ▼
                    proof + public inputs [threshold, rulePack, commitment]
                                 │
                                 │  POST /api/sbt/mint
                                 ▼
                    verify proof, check statement against public
                    inputs, then relay the mint transaction
```

**What crosses the boundary:** the witness goes to the operator's own proving endpoint and no
further. What is published on-chain is the commitment, the threshold and the rule pack —
never the digest, the score, the PUE or the layout.

**Why the commitment is a circuit output, not an input:** a prover cannot then publish a
commitment that disagrees with the witness it proved about. `verify()` also checks the
statement against the proof's own public inputs, so a valid proof shipped beside a lying
statement fails.

**Runtime constraint:** `bb.js` ships multi-megabyte WASM and requires Node. It is loaded
lazily and declared in `serverExternalPackages`; a static import pulls the WASM into the edge
bundle and breaks the Cloudflare build. Real proving therefore cannot run on Cloudflare
Workers — that route needs a Node host, and on Workers `getProver()` falls through to the
mock. See `docs/NOIR_ZK.md`.

## Data flow

1. **Builder**: every placement mutates the Zustand store. zundo captures
   the change for undo/redo. `useAutoSave` debounces 1.5 s and writes
   the snapshot to IndexedDB.
2. **Share**: `useSaveBuild` produces a deterministic buildId (SHA-256 of
   the snapshot). The snapshot is also LZ-string-compressed and
   appended to the URL as `?share=v1.lz.<payload>`.
3. **Score**: `score(state)` is a pure function. No `Date.now`, no
   `Math.random` — same input always produces the same report. This is
   what makes certificates cryptographically meaningful.
4. **Cert**: the report + buildId + wallet address are rendered into
   an SVG. The QR code points to a verifier URL that re-runs the
   score from the embedded snapshot.
5. **Knowledge graph**: `buildKnowledgeGraph(state)` runs extract → fuse →
   gate. `graphDigest(graph)` is a canonical SHA-256 over the *fused*
   graph — the ZK commitment binds to this, so a verifier can rebuild
   the same graph and reproduce it.
6. **ZK proof**: the witness (digest, 0–100 score, random blinding) is
   derived in the browser and exchanged for a threshold proof. The exact
   score never appears in the statement.
7. **SBT mint relay**: the server route validates the build, **verifies the
   proof before the irreversible edge**, uploads metadata, and relays a
   mint transaction. The contract enforces non-transferability and
   duplicate blueprint prevention. Metadata records which prover produced
   the proof, so a simulated proof cannot be published as a real one.
8. **Sim**: the sim page reads the same store, drops NPCs around the
   build, and runs scheduled events. Player does not intervene here —
   it is the "watch your design operate" mode.

## Determinism guarantees

- **No wall clock** in the scoring engine.
- **No `Math.random`** in the scoring engine.
- **No external IO** in the scoring engine.
- **No mutation** of the input state.
- **Pure zod** for all I/O schemas.
- All randomness in the **sim** mode is explicitly time-driven and is
  not part of the certificate.

## Bundle strategy

- 3D canvas: dynamic import (`ssr: false`) so the landing page does
  not pay for it.
- Solana adapter: lazy-loaded only if the user picks Solana.
- Block registry: a single static module — the only thing the server
  needs to know about the catalog is its 47 ids; each is small.
- ZK libraries (`@noir-lang/noir_js`, `@aztec/bb.js`): lazy, Node-only,
  and declared as server externals. They must never reach a browser or
  edge bundle.
- The intro sequence (`components/intro/`): `next/dynamic`, so three/drei
  stay out of the landing bundle.
- Scoring rules: a single static module. Add a rule, it works
  everywhere.

## Threat model (summary)

- **Wallet signature**: server verifies the signature, then issues a
  short-lived (12 h) iron-session httpOnly cookie. CSRF-safe via
  sameSite=strict.
- **Snapshot tampering**: the share token is the SHA-256 of the
  snapshot. The verifier endpoint re-runs the score on the embedded
  snapshot. The wallet address on the certificate is part of the
  signed message.
- **Mint abuse**: the mint route requires a valid wallet address, a
  certifiable score, a **valid ZK proof made under the same rule pack that
  judged the build**, and the server-side signing secret. The contract
  owner account is the only mint authority. Verification sits immediately
  before the transaction because minting is the irreversible edge.
- **Proof forgery**: `MockProver` is forgeable by construction and is
  refused in production unless `ZK_ALLOW_MOCK=true`. When it is allowed,
  both the UI and the on-chain metadata state that the proof was
  simulated — enforced by tests.
- **Statement/proof mismatch**: a cryptographically valid proof can still
  attest to a different claim, so `verify()` checks the statement against
  the proof's own public inputs (threshold, rule pack, commitment).
- **XSS**: no `dangerouslySetInnerHTML` anywhere. SVG is built with
  React JSX.

See `docs/SECURITY.md` for the full threat model.
