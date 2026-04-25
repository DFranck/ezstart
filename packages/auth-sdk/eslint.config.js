import { config as baseConfig } from '@ezstart/eslint-config/base'

/**
 * Auth-SDK ESLint config — extends the shared base and forces the
 * `@ezstart/ezstart/auth-sdk` rule to `error`. The rule lives in the
 * shared `@ezstart/eslint-plugin-ezstart` plugin and blocks monorepo-coupling
 * imports (`@ezstart/config`, `@ezstart/logger`, `next-intl`) inside
 * `packages/auth-sdk/src/components/` so the SDK stays publishable npm-standalone.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    rules: {
      '@ezstart/ezstart/auth-sdk': 'error',
    },
  },
]
