import js from '@eslint/js'
import ezstartPlugin from '@ezstart/eslint-plugin-ezstart'
import eslintConfigPrettier from 'eslint-config-prettier'
import onlyWarn from 'eslint-plugin-only-warn'
import turboPlugin from 'eslint-plugin-turbo'
import tseslint from 'typescript-eslint'

/**
 * A shared ESLint configuration for the repository.
 *
 * @ezstart/ezstart rules activated here are the universal ones (any runtime):
 * - `no-fetch-client` → `error` (0 pre-existing violations, migration done in Phase 3)
 * - `parse-api-error-required` → `warn` (TODO: upgrade to `error` after sweep — currently
 *   ~23 matches across pay-sdk/auth-sdk/ui)
 * - `no-alert-confirm` → `warn` (TODO: upgrade to `error` after sweep — currently ~8 matches
 *   across pay-sdk/ui + green-pulse/gacha-analyzer/asc-tcd web apps)
 * - `no-console-log` → `warn` (Phase 0 external-devs — progressive cleanup; force @ezstart/logger)
 *
 * Next.js/web-only rules (`no-raw-fetch`, `no-raw-html`, `no-hardcoded-tailwind-colors`,
 * `no-dialog-outside-ui`, `require-i18n-string`, `no-local-ui-components`) live in `./next.js`.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
      '@ezstart/ezstart': ezstartPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'off', // Disable annoying env var warnings
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off', // TypeScript handles this better
      '@typescript-eslint/no-require-imports': 'off', // Allow require() in config files
      '@typescript-eslint/no-namespace': 'off', // Allow namespaces
      '@typescript-eslint/no-empty-object-type': 'off', // Allow {} type
      // Universal @ezstart conventions
      '@ezstart/ezstart/no-express-core': 'error',
      '@ezstart/ezstart/no-fetch-client': 'error',
      '@ezstart/ezstart/parse-api-error-required': 'warn',
      '@ezstart/ezstart/no-alert-confirm': 'warn',
      '@ezstart/ezstart/no-console-log': 'warn',
      '@ezstart/ezstart/no-hardcoded-tailwind-colors': 'warn',
      '@ezstart/ezstart/no-dialog-outside-ui': 'warn',
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ['dist/**'],
  },
]
