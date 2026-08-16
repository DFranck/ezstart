import { config as baseConfig } from '@ezstart/eslint-config/base'

/**
 * pay-sdk specific ESLint config. Inherits the workspace base + activates the
 * `@ezstart/ezstart/pay-sdk` rule that enforces agnosticism (no `@ezstart/logger`
 * in components, no `@ezstart/config` anywhere in src/).
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    rules: {
      '@ezstart/ezstart/pay-sdk': 'error',
    },
  },
]
