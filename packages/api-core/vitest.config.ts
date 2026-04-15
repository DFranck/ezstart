import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @ezstart/api-core
 *
 * Per data-protection.md rules:
 * - Force NODE_ENV=test (no real DB, no production URLs)
 * - All network/DB interactions are mocked in tests
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
  },
})
