# Launch checklist (P24)

> Print this. Tape it to the wall. Check off as you go.

## T-7d

- [ ] All 24 phases marked ✅ in `docs/STATUS.md`.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` clean on `main`.
- [ ] `npm run analyze` shows initial bundle < 250 kB.
- [ ] Lighthouse CI run: Performance ≥ 90, A11y ≥ 90, Best Practices ≥ 90, SEO ≥ 90.
- [ ] Pen-test report delivered; high/critical issues triaged.
- [ ] Legal: ToS, Privacy, Cookie, DPA, AI policy reviewed by counsel; signed.
- [ ] DPA counter-signed template ready for first Enterprise lead.
- [ ] Security headers verified (HSTS, CSP, X-Frame, Referrer-Policy, Permissions-Policy).
- [ ] `/.well-known/security.txt` published with PGP key.
- [ ] Sentry project created; DSN set in `NEXT_PUBLIC_SENTRY_DSN`; sample error received.
- [ ] PostHog project created; consent banner tested.
- [ ] Credly organization created; 4 templates (Bronze/Silver/Gold/Platinum) configured; first test issue verified end-to-end.
- [ ] WalletConnect project ID set in `NEXT_PUBLIC_WC_PROJECT_ID`.
- [ ] Domain DNS: A / CNAME records pointed; DNSSEC on; CAA record for the chosen CA.
- [ ] TLS: certificate issued; HSTS preload request submitted.
- [ ] CDN: Vercel / Cloudflare configured; cache rules for `/api/*` set to `no-store`; static assets cached aggressively.
- [ ] Monitoring: Vercel Analytics + Sentry + PostHog + UptimeRobot (or Better Uptime).
- [ ] Status page: statuspage.io (or betteruptime) configured; subscribe-by-email and RSS feeds live.
- [ ] On-call rotation: PagerDuty schedule with 2 engineers and a backup.
- [ ] Runbook: `/docs/INCIDENTS/runbook.md` reviewed; 1 dry-run completed.
- [ ] Rollback plan: last-known-good build ID documented; 1-click revert in Vercel verified.
- [ ] Backups: Vercel KV nightly export to R2; weekly restore drill completed.
- [ ] Support inbox: support@datacenterbuilder.example set up; autoresponder configured.
- [ ] Social cards: OG image, Twitter card, LinkedIn banner at 1200×630.
- [ ] Press kit: one-pager PDF + 4 screenshots + 1 short demo video.

## T-24h

- [ ] On-call engineer confirmed awake.
- [ ] All PRs merged; `main` is green.
- [ ] Production deploy triggered.
- [ ] Smoke test: build → score → cert round-trip from a fresh browser profile.
- [ ] Wallet auth: sign in with MetaMask + WalletConnect + Coinbase + Phantom (EVM).
- [ ] Credly push: end-to-end test of one badge issue.
- [ ] `curl -fsS https://<domain>/api/health` returns 200.
- [ ] All 14 routes return 200 (no 5xx, no 4xx on `/`).
- [ ] No `console.error` in the browser console on any route.
- [ ] All social links on the landing page return 200.
- [ ] DNS: dig confirms resolution; `nslookup` from a non-cached resolver.
- [ ] TLS: `testssl.sh` clean.
- [ ] Lighthouse on production URL: same scores as the staging run.
- [ ] Status page shows "All systems operational".

## T-1h

- [ ] Final on-call handoff in #launch.
- [ ] War-room channel open.
- [ ] Status page showing "All systems operational".
- [ ] Social post scheduled for T+0.
- [ ] Launch email drafted; ready to send at T+0.

## T+0 (Launch)

- [ ] Push the deploy (or already deployed).
- [ ] Send the launch email.
- [ ] Post on Twitter / LinkedIn / Hacker News / r/datacenter.
- [ ] Update LinkedIn banner.
- [ ] DM the 5 warmest leads.
- [ ] Pin a status banner: "Welcome! All systems operational."

## T+1h

- [ ] Watch Sentry for spikes.
- [ ] Watch Vercel logs for spikes.
- [ ] Check status page: still green?
- [ ] Manual review of first 10 user builds (in the public Credly feed).
- [ ] Triaging queue: any bug reports in support inbox?

## T+24h

- [ ] Retrospective meeting: what broke? what was great?
- [ ] Update `docs/INCIDENTS/launch-YYYY-MM-DD.md` with the timeline.
- [ ] Share the retro with the team.
- [ ] Re-archive this checklist to `docs/INCIDENTS/launch-YYYY-MM-DD.md`.
- [ ] On-call: rotate back to the normal schedule.

## Post-launch (first week)

- [ ] Monitor Credly publish rate; expect < 1% of builds to publish.
- [ ] Monitor session-cookie error rate; expect < 0.1%.
- [ ] Monitor wallet connect failures; expect < 2%.
- [ ] Open GitHub issues for any reported bugs.
- [ ] Triage: which phase-25+ feature should we ship first?
