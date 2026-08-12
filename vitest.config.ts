import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  // Keep the cache out of the repo, but resolve the temp root per-platform:
  // the previous hardcoded /private/tmp exists only on macOS and made CI die
  // with EACCES trying to mkdir /private.
  cacheDir: path.join(os.tmpdir(), 'vitest-cache-datacenter-sim'),
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // tests/workers/ runs in real workerd via vitest.workers.config.ts. Running
    // it here too would execute edge-runtime assertions under jsdom, where they
    // are meaningless (and the "no DOM" check correctly fails).
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/workers/**'],
    setupFiles: ['tests/setup.ts'],
    // The scoring engine reads the certification threshold from the environment
    // once, at module load. Left ambient, the score-integrity snapshots would
    // encode whatever threshold the recording machine happened to have — so the
    // guard would drift instead of catching drift. Pin it to the shipped default.
    // Wiring tests assert against MockProver so they stay deterministic and
    // fast; bb.js ships WASM that has no business loading under jsdom. The real
    // prover is exercised for real in tests/unit/noir-prover.test.ts, which
    // opts back in and runs in the node environment.
    env: { NEXT_PUBLIC_CERT_THRESHOLD: '40', ZK_NOIR: 'false' },
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
  // Component tests use JSX without importing React; Next compiles with the
  // automatic runtime, so vitest has to as well.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
