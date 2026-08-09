/**
 * Vitest config for the Cloudflare Workers runtime.
 *
 * The main `vitest.config.ts` runs in jsdom on Node. That is the wrong runtime
 * for anything that ships to the edge: workerd has a different global surface
 * (its own WebCrypto, no Node builtins unless `nodejs_compat` is on), so code
 * can pass every Node test and still fail in production.
 *
 * This config runs a focused suite inside real workerd, via the same
 * compatibility flags as `wrangler.jsonc`. Run it with:
 *
 *   npm run test:workers
 */

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersConfig({
  test: {
    include: ['tests/workers/**/*.test.ts'],
    poolOptions: {
      workers: {
        miniflare: {
          // Kept in step with wrangler.jsonc — if these drift, this suite stops
          // testing the runtime the app actually deploys to.
          compatibilityDate: '2026-06-07',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
