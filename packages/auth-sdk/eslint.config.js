import { config as reactConfig } from '@ezstart/eslint-config/react-internal'

/**
 * Auth-SDK ESLint config — extends the shared react-internal preset (which
 * registers `eslint-plugin-react-hooks` so `react-hooks/exhaustive-deps`
 * disable comments resolve cleanly) and forces the
 * `@ezstart/ezstart/auth-sdk` rule to `error`. The rule lives in the
 * shared `@ezstart/eslint-plugin-ezstart` plugin and blocks monorepo-coupling
 * imports (`@ezstart/config`, `@ezstart/logger`, `next-intl`) inside
 * `packages/auth-sdk/src/components/` so the SDK stays publishable npm-standalone.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...reactConfig,
  {
    rules: {
      '@ezstart/ezstart/auth-sdk': 'error',
    },
  },
  {
    // Test wrappers (e.g., `createWrapper`) intentionally return anonymous
    // functional components — they're never rendered as standalone in the UI
    // and don't need a display name.
    files: ['src/__tests__/**/*.{ts,tsx}'],
    rules: {
      'react/display-name': 'off',
    },
  },
]
