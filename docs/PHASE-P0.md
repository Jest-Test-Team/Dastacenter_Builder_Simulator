# Phase 0 — Project bootstrap

## Goal
Stand up a working Next.js 15 app with TypeScript strict mode, Tailwind, and the tooling we need for the rest of the build.

## Files
- `package.json` — pinned dep versions, scripts (`dev`, `build`, `test`, `lint`, `typecheck`, `format`, `analyze`)
- `tsconfig.json` — strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- `next.config.js` — `optimizePackageImports`, `remotePatterns` for Credly CDN, GLSL webpack rule, security headers
- `tailwind.config.ts` — custom theme (bg/fg/border/primary/accent + 7 category colors)
- `postcss.config.js` — Tailwind + autoprefixer
- `.eslintrc.json` — `next/core-web-vitals`
- `.prettierrc` — Tailwind class sort, semi, 100-col
- `.gitignore` — `node_modules/`, `.next/`, `coverage/`, `.env*.local`
- `.env.example` — all env vars with placeholders

## Decisions
- **React 19 RC**: pinned via the `types-react@19.0.0-rc.1` override. Use `--legacy-peer-deps` on install.
- **App Router**: yes, RSC where it helps, `'use client'` on interactive parts.
- **No UI framework**: Tailwind + CSS variables. Total control of the bundle.
- **No ORM, no DB**: pure FE.

## Verification
- `npm install --legacy-peer-deps` succeeds
- `npm run lint` clean
- `npm run typecheck` clean (the 60-errors we hit later all came in P2/P7/P12)

## Next phase
P1 — Grid + block system.
