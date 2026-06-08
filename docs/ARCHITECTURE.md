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
│  /api/credly/issue   → server-side SBT mint relay          │
│                        (ethers signer, never in client)     │
└─────────────────────────────────────────────────────────────┘
```

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
5. **SBT mint relay**: the server route validates the build, uploads
   metadata, and relays a mint transaction to the configured EVM
   chain. The contract enforces non-transferability and duplicate
   blueprint prevention.
6. **Sim**: the sim page reads the same store, drops NPCs around the
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
  needs to know about the catalog is its 40 ids; each is small.
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
- **Mint abuse**: the issue route requires a valid wallet address, a
  certifiable score, and the server-side signing secret. The contract
  owner account is the only mint authority.
- **XSS**: no `dangerouslySetInnerHTML` anywhere. SVG is built with
  React JSX.

See `docs/SECURITY.md` for the full threat model.
