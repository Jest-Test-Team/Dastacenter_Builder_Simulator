# Security

## Headers (next.config.js)

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` with a strict default-src + frame-ancestors
  'none' (TBD: specific script/style allowlist for inline styles needed
  by R3F).

## Authentication

- **No email/password**. The only auth path is a wallet signature.
- SIWE for EVM (EIP-4361, signed by the wallet over a server-minted
  nonce). Verified with `viem`'s `verifyMessage` on the server.
- Iron-session httpOnly secure cookie. 12 h TTL. sameSite=strict.
- The wallet address is the only identity. There is no "user account"
  in the database.

## Authorization (server routes)

- `/api/credly/issue` — requires:
  1. Valid session.
  2. Score ≥ 40.
  3. Body includes the wallet address; must match the session.
  4. User has explicitly opted in (checkbox in the cert UI).

## Cryptographic guarantees

- The buildId is a SHA-256 of the canonical JSON of the snapshot.
- The certificate includes the buildId, the wallet address, the score,
  and the timestamp. The QR points to a verifier route that:
  1. Re-hydrates the snapshot from the URL fragment.
  2. Re-runs the score.
  3. Confirms the result matches the certificate claim.
  4. Confirms the wallet address is the one that signed the session.

## Persistence

- All builds live in IndexedDB on the user's device.
- A "share link" is a LZ-string-compressed snapshot in the URL —
  nothing leaves the browser unless the user clicks "publish to
  Credly" or "email me a copy".

## No tracking by default

- No third-party analytics scripts.
- No tracking pixels.
- No cookies besides the auth session.
- Vercel Web Analytics is opt-in and aggregated.
- If we add PostHog/Sentry, both go behind a consent gate.

## Threat model

| Threat | Mitigation |
| --- | --- |
| Phishing a SIWE nonce | nonce is bound to a 5-min TTL and a 5-min cooldown |
| Replay | nonce + cookie expire together; new nonce per sign-in |
| XSS via 3D content | R3F never renders arbitrary HTML; only geometry + textures |
| XSS via cert SVG | SVG built with React JSX; no innerHTML |
| Snapshot tampering | buildId = SHA-256(snapshot); verifier re-runs the score |
| Credly spam | session + score ≥ 40 + opt-in |
| Session theft | httpOnly secure sameSite=strict cookie, 12 h TTL |
| CSP bypass | strict CSP; nonce-based script tags in `_document.tsx` |

## Incident response

- Disable `/api/credly/issue` first (single env var flag).
- Rotate `SESSION_SECRET` to invalidate all sessions.
- Rebuild and redeploy to flush any poisoned client cache.
- Post-mortem in `docs/INCIDENTS/YYYY-MM-DD.md`.
