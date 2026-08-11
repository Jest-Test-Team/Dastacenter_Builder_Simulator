import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  cacheDir: '/private/tmp/vitest-cache',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // tests/workers/ runs in real workerd via vitest.workers.config.ts. Running
    // it here too would execute edge-runtime assertions under jsdom, where they
    // are meaningless (and the "no DOM" check correctly fails).
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/workers/**'],
    // The scoring engine reads the certification threshold from the environment
    // once, at module load. Left ambient, the score-integrity snapshots would
    // encode whatever threshold the recording machine happened to have — so the
    // guard would drift instead of catching drift. Pin it to the shipped default.
    env: { NEXT_PUBLIC_CERT_THRESHOLD: '40' },
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
