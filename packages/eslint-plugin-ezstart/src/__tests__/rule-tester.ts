import * as tsParser from '@typescript-eslint/parser'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'

/**
 * Wire `@typescript-eslint/rule-tester` into Vitest's test globals so
 * `ruleTester.run(...)` produces nested `describe` / `it` blocks.
 *
 * @internal
 */
RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/**
 * Shared `RuleTester` configured for modern ES2022 TypeScript + JSX.
 *
 * @internal
 */
export const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
})
