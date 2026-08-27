# KSN autonomous settlement agent

> An agent reads a privacy credential from chain, verifies it, and disburses a
> real ERC-20 dividend to the holder — without ever seeing the design behind it.

This closes the economic loop: build → prove → mint → **get paid**. It is the
last beat of the demo and the one a reviewer will probe hardest, so the whole
thing is built to survive being probed.

## The rule

Every line the agent prints is emitted **after** the work it describes
completed. Nothing is on a timer, `elapsedMs` is measured, and the terminal is a
log rather than an animation.

This replaced a panel that walked four hard-coded strings on a 900 ms
`setTimeout`. `docs/PHASE-P37-44.md` already said of the proving console that *"a
scripted console in a privacy demo is precisely the thing a reviewer should
distrust"* — the dividend panel was the exception, and it sat in the closing
frame.

Two invariants back it up, both asserted by tests:

1. **No `settled` event without a transaction hash.** The only place one is
   constructed is after `tx.wait()` returns a receipt. Everything else that
   stops a run emits `blocked` with the real reason, and the UI says so.
2. **The model never decides the amount.** It writes one sentence of rationale;
   the figure is re-derived from the published rate card. A hallucinated number
   cannot become a transfer.

## What the agent verifies

The SNARK is *not* re-verified — the proof bytes are never written to chain, and
bb.js cannot run in the Workers runtime. What the agent has is the credential as
published, and that is enough for the properties a payer cares about
(`src/lib/agent/credential.ts`):

| Check | What it rules out |
|---|---|
| Ownership | Paying someone who does not hold the token |
| Metadata binding | A metadata document swapped for a different token's |
| Cryptographic backing | A `mock` proof, which is forgeable by construction |
| Circuit | A proof of some other statement entirely |
| Rule pack | A pack the agent has never heard of |
| Threshold cleared | A credential below the agent's bar |
| **Design not disclosed** | An exact score, PUE, layout or digest in the published document |

The last one is the interesting one. "Commercial secrets did not leak" is checked
over the actual bytes that were published forever, so if the metadata builder
ever starts writing an exact score into a public document, the agent refuses to
pay and names the reason.

## Pieces

| Path | Role |
|---|---|
| `contracts/src/KsnDividendToken.sol` | ERC-20. No owner, no mint, no pause — the agent has no privileged standing |
| `src/lib/agent/settle.ts` | The run, as an async generator of typed events |
| `src/lib/agent/credential.ts` | The checks above, pure and chain-free |
| `src/lib/agent/rate-card.ts` | Published rates, so a holder can predict their own payout |
| `src/app/api/agent/settle/route.ts` | SSE stream — the first streaming route in the repo |
| `src/components/agent/AgentTerminal.tsx` | The terminal |
| `src/components/agent/DividendToast.tsx` | The receipt, which only a `settled` event can trigger |

## Deploying to Sepolia

```bash
# 1. Create a wallet for the agent. Deliberately NOT the SBT minter key — the
#    party paying the dividend should be independent of the issuer.
# 2. Deploy the token, minting the treasury to that wallet:
KSN_AGENT_ADDRESS=0x<agent> npm run deploy:ksn

# 3. Record the printed address in .env.local and in wrangler.jsonc `vars`:
#      NEXT_PUBLIC_KSN_TOKEN_ADDRESS_SEPOLIA=0x...
# 4. The signing key is a secret, never a var:
wrangler secret put KSN_AGENT_PRIVATE_KEY

# 5. Fund the agent wallet with Sepolia ETH for gas.
```

`scripts/check-minter-balance.mjs` watches the agent's gas alongside the minter's
once `KSN_AGENT_ADDRESS` is set — an agent that runs dry fails late, as a revert,
mid-demo.

Until the token address is set the agent halts at `settle` with *"Agent treasury
is not configured … No transfer was made."* It never reports a payment it did not
make.

## Testing the settle path locally

Deploying to a testnet to check a transfer is slow and costs gas. A local EVM
gives a real signature and a real receipt in seconds:

```bash
npm run chain:local        # terminal 1 — hardhat node on 127.0.0.1:8545
npm run chain:local:demo   # terminal 2 — deploys SBT + KSN, mints a credential
```

The second command prints the env lines to paste into `.env.local`, plus the
agent key (Hardhat account #1). Add `NEXT_PUBLIC_DEMO_WALLET=<architect address>`
and the dashboard will connect read-only to that address, load the local
credential and run the agent end to end — including the transfer.

Three things had to be true for this to work, each of which failed silently first:

- **`process.env[key]` with a dynamic key is never inlined into client bundles.**
  The other chains only work because they fall back to a hardcoded
  `sbtContractAddress`; a local chain has none, so `getSBTContractAddress` needs a
  literal `process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_LOCALHOST` reference.
- **CSP `connect-src` must list the local RPC**, or the chain read dies with
  nothing but a console violation — the same trap that broke bb.js. It is added
  in development only.
- **The demo connector is read-only.** It produces no valid signature, so SIWE
  sign-in and minting still fail with it. It reads public chain data, which
  anyone can read anyway, and is absent unless `NEXT_PUBLIC_DEMO_WALLET` is set.
