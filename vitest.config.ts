import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  cacheDir: '/private/tmp/vitest-cache',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
