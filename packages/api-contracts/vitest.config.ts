import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @ezstart/api-contracts
 *
 * Per data-protection.md rules:
 * - Force NODE_ENV=test
 * - Pure unit tests (no DB, no network) — contracts are pure schema/type work.
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
