import { config as baseConfig } from '@ezstart/eslint-config/base'

/**
 * Logger ESLint config — extends the shared base. The logger source
 * intentionally uses `console.*` (it IS a console wrapper) so we
 * disable `no-console` for `src/`. Tests still get the default rule.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    files: ['src/index.ts', 'src/server.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
