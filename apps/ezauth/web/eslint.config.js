import { nextJsConfig } from '@ezstart/eslint-config/next-js'

/**
 * @type {import("eslint").Linter.Config[]}
 *
 * Showcase exemption — `(bare)/docs/components/**` and the surrounding
 * docs UI render literal SDK component markup so devs can see exactly
 * what will be installed. By design they:
 *   - copy raw HTML samples (`<a>`, `<span>`) verbatim
 *   - use literal component-name labels (`Open SignInModal`, `Ctrl K`)
 *     that should NOT be translated (they ARE the doc artefact)
 *
 * The two `@ezstart/ezstart` rules that target production app polish
 * are turned off in those paths only. Production routes (`(public)`,
 * `(dashboard)`, server entries, etc.) keep the rules at their normal
 * `warn` severity from `@ezstart/eslint-config/next-js`.
 */
export default [
  ...nextJsConfig,
  {
    files: ['src/app/**/(bare)/docs/**'],
    rules: {
      '@ezstart/ezstart/no-raw-html': 'off',
      '@ezstart/ezstart/require-i18n-string': 'off',
    },
  },
]
