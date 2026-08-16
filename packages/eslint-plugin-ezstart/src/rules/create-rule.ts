import { ESLintUtils } from '@typescript-eslint/utils'

/**
 * Shared rule factory for `@ezstart/eslint-plugin-ezstart`.
 *
 * Produces a URL under the monorepo docs so IDE hovers and CI reports link
 * back to the rule documentation.
 *
 * @internal
 */
export const createRule = ESLintUtils.RuleCreator(
  name =>
    `https://github.com/DFranck/ezstart/tree/master/packages/eslint-plugin-ezstart/README.md#${name}`
)
