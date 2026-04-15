import { defineConfig } from 'vitest/config'

/**
 * Vitest config for @ezstart/eslint-plugin-ezstart
 *
 * Per data-protection.md rules:
 * - Force NODE_ENV=test
 * - Pure unit tests (no DB, no network) — we only exercise the AST rules via
 *   `@typescript-eslint/rule-tester`.
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
