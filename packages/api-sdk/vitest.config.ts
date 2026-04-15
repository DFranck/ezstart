import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @ezstart/api-sdk
 *
 * Per data-protection.md rules:
 * - Force NODE_ENV=test
 * - No production URLs, only mocked fetch
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
