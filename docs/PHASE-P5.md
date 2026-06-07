# Phase 5 — Wallet auth (no email)

## Goal
Deliver the wallet auth (no email) work so the rest of the product can build on it.

## Files added
`lib/wallet/{wagmi,solana,siwe,siws,session}.ts`. `app/api/auth/{nonce,verify,session,logout}/route.ts`. `app/api/auth/nonce-store.ts`.

## Key decisions
Server-side nonce store is in-memory in v1; production should move to Upstash. Wallet address is the only identity. There is no `User` record in any database.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 6](./PHASE-P6.md)
