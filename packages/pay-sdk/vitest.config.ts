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
