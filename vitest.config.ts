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
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
