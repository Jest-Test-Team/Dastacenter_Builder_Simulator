# Known Issues — Web3 SBT Certificate Mint (2026-06-09)

Snapshot of open issues and current state after wiring the NFT-only mint flow
into the result/verify pages and deploying to Cloudflare.

Legend: 🔴 blocking · 🟡 needs attention · 🟢 resolved (kept for context)

---

## Deployment / CI

### 🔴 Cloudflare git-CI build command is wrong
- **Symptom:** CI deploy fails with `The entry-point file at ".open-next/worker.js" was not found.`
- **Cause:** Dashboard build settings use **Build command `npm run build`** (plain `next build`), but the deploy step (`npx wrangler deploy`) needs the OpenNext bundle produced only by `npm run build:cloudflare`.
- **Fix:** Cloudflare dashboard → Worker `datacenter-simulator` → **Settings → Build → Build command** → set to:
  ```
  npm run build:cloudflare
  ```
  Leave deploy command as `npx wrangler deploy`.

### 🟡 Local `npm run deploy` intermittently fails (esbuild `.map` loader)
- **Symptom:** `No loader is configured for ".map" files: node_modules/next/dist/compiled/next-server/*.runtime.*.js.map`
- **Cause:** Stale `.next` / `.open-next` build cache from earlier parallel/interrupted builds (Node v25 — unsupported by some tooling — may aggravate it).
- **Workaround:**
  ```bash
  rm -rf .next .open-next .next-verify && npm run deploy
  ```
- **Status:** First deploy of the day succeeded (live deployment `2026-06-09T03:59`). A follow-up redeploy carrying one small `MintCertificateCard.tsx` edit (the `buildId` fix) did **not** land — production is one commit behind on that file until a clean redeploy or the git CI runs.

### 🟡 Node.js v25.8.0 is unsupported by the toolchain
- Hardhat and parts of the build warn/break on Node 25. Recommend pinning Node 20 LTS (e.g. `nvm use 20`) for builds and contract deploys.

---

## Secrets / Config

### 🟢 Cloudflare Worker secrets set
`SBT_MINTER_PRIVATE_KEY`, `PRIVATE_KEY`, `SESSION_SECRET` uploaded via `wrangler secret put` to worker `datacenter-simulator`. (Server-side mint + iron-session now work in production.)

### 🟡 `NEXT_PUBLIC_*` contract addresses are build-time inlined
`NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY` / `_SEPOLIA` must be present in the **build environment** (`.env.local` locally; Build variables in CI). They are NOT runtime secrets — changing them requires a rebuild/redeploy.

### 🔴 `NEXT_PUBLIC_NFT_STORAGE_KEY` is invalid
- **Symptom:** `https://api.nft.storage/upload` returns `401 ERROR_MALFORMED_TOKEN`.
- **Impact:** IPFS upload always fails. On testnet the code falls back to **on-chain data-URI metadata**, so minting still works — but metadata is stored on-chain, not IPFS.
- **Fix options:** delete the key (rely on on-chain fallback) **or** set a valid `NEXT_PUBLIC_PINATA_KEY` (Pinata JWT) — `metadata.ts` already supports Pinata as a fallback.

---

## Chains / Funds

### 🟢 Contracts deployed (both testnets, same address)
- Polygon Amoy (80002): `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB`
- Ethereum Sepolia (11155111): `0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB`
- Minter / owner / deployer: `0x556C7223e63159E9945E73dE36866eF0e3eea687`
- Default mint chain in UI: **Sepolia**. End-to-end mint verified on Sepolia (token #1, soulbound transfer reverts as expected).

### 🟡 Polygon Amoy minter balance low
- ~0.025 POL; a mint needs ~0.026 POL (Amoy gas spiking). Amoy mints will fail until topped up.
- Faucet is rate-limited (1/24h) + identity-gated → cannot be fully auto-claimed.
- A monitor cron exists: `scripts/check-minter-balance.mjs` (runs 3×/day, alerts when < 0.05 POL). Sepolia minter is well funded (~1.9 ETH).

### 🟡 Block-explorer verification skipped
Contract not verified on Polygonscan/Etherscan (no API key configured). Cosmetic only — set `POLYGONSCAN_API_KEY` / `ETHERSCAN_API_KEY` to enable.

---

## App behavior (by design, documented to avoid confusion)

### 🟢 "Mint" button only appears for certifiable builds
The result page shows the mint card only when `report.certifiable` is true. Non-certifiable builds (e.g. Tier F) now show an explanatory notice + Retry instead of a hidden/blank area. Certifiable demos for testing: `greenfield-tier3` (97/Tier IV), `tier4-retrofit` (97), `edge-micro` (78).

### 🟢 "Unknown chain" badge does not block minting
The mint is relayed server-side on the selected chain, independent of the wallet's current network. The badge is cosmetic; the mint card reads on-chain state from the selected chain, not the wallet chain.

---

## Security reminders
- `SBT_MINTER_PRIVATE_KEY` / `SESSION_SECRET` were shared in plaintext during setup — treat as **testnet-only**. Generate a fresh minter wallet and rotate `SESSION_SECRET` before any mainnet/production use.
- `.env.local` is gitignored (verified). Do not commit it.
