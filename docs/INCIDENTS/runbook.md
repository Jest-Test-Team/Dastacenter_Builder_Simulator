# Incident runbook

## Severity levels

| Sev | Definition | Example | Response time |
| --- | --- | --- | --- |
| Sev-1 | Service is down or data loss | Build page returns 500 for all users | < 15 min |
| Sev-2 | Major feature broken | Scoring engine throws for any build | < 1 h |
| Sev-3 | Minor feature broken | Share link has wrong format | < 4 h |
| Sev-4 | Cosmetic / copy | Typo on landing page | next business day |

## Sev-1 / Sev-2 response

1. **Acknowledge** in #incidents; assign incident commander.
2. **Open status page incident** (statuspage.io or betteruptime).
3. **Mitigate first, debug second.** If the cause is unknown, revert to the last known-good build via Vercel.
4. **Communicate every 15 min** on the status page.
5. **Resolve** the underlying cause.
6. **Post-mortem** within 48 h, archived to `docs/INCIDENTS/YYYY-MM-DD.md`.

## Common incidents

### "Build page returns 500"

- Check Vercel logs for the last deploy.
- `curl -fsS https://<domain>/api/health`.
- If recent deploy, revert via Vercel: `vercel rollback`.
- If a wallet adapter, the cause is most often a provider SDK update; pin the version.

### "Credly push is failing"

- Check `/api/credly/issue` returns the expected error code.
- Check `CREDLY_API_TOKEN` is not expired (rotated every 90 d).
- Check Credly status (status.credly.com).
- Disable the route: `CREDLY_API_TOKEN=""` and redeploy.

### "Session cookie not being set"

- Check `SESSION_SECRET` is set and ≥ 32 characters.
- Check the domain matches the cookie domain (no `www` vs apex mismatch).
- Check that the user is on HTTPS (HSTS preload should force this).

### "Wallet signature fails"

- Check the SIWE nonce endpoint `/api/auth/nonce` returns 200.
- Check `viem.verifyMessage` is using the same chain ID as the wallet.
- If a specific chain (e.g. Base) is failing, check the chain ID is in the wagmi config.

### "Certificate SVG renders broken in Safari"

- Most likely a CSS variable not resolving. Check `currentColor` usage in `CertificateSvg.tsx`.
- Check that the `viewBox` is set correctly (Safari is stricter than Chrome).
- Re-export with `width="100%"` removed.

## Contact

- On-call: PagerDuty schedule
- Security: security@datacenterbuilder.example
- Comms: @dcbuilder on Twitter
