import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @ezstart/pay-sdk
 *
 * Per data-protection.md rules:
 * - Force NODE_ENV=test
 * - No production URLs, only mocked fetch/API
 * - jsdom environment for React component + hook tests
 */
export default defineConfig({
  resolve: {
    alias: {
      // The Next.js `server-only` package throws when imported from a
      // non-RSC context (which Vitest is). Alias it to an empty module so
      // server-only files (`packages/pay-sdk/src/server/*.ts`) can be
      // imported from test files without forcing each suite to mock it.
      'server-only': new URL('./src/__tests__/_stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    // Never run tests from `dist/` — it contains stale compiled copies that
    // drift out of sync with `src/` and cause spurious failures.
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
