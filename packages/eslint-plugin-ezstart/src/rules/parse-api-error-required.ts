import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './create-rule.js'

/**
 * Detects the anti-pattern `throw new Error(X.error || '…')` where `X` is a
 * variable (an API response body).
 *
 * Why it's bad: `X.error` is frequently an `ErrorPayload` object — stringifying
 * it yields `[object Object]`, which hides the real message from the user.
 *
 * Replacement: `throw new Error(parseApiError(X.data) ?? '…fallback…')`
 *
 * Autofix is only applied when `parseApiError` is already imported in the
 * file — otherwise the caller must add the import themselves.
 */
export const parseApiErrorRequired = createRule({
  name: 'parse-api-error-required',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require parseApiError() when throwing from an API response instead of new Error(response.error).',
    },
    fixable: 'code',
    schema: [],
    messages: {
      useParseApiError:
        "Use parseApiError() instead of 'new Error({{source}}.error || …)' — passing an ErrorPayload object to Error() yields '[object Object]'.",
    },
  },
  defaultOptions: [],
  create(context) {
    function isParseApiErrorImported(): boolean {
      const sourceCode = context.sourceCode ?? context.getSourceCode()
      const program = sourceCode.ast
      for (const statement of program.body) {
        if (statement.type !== 'ImportDeclaration') continue
        for (const spec of statement.specifiers) {
          if (
            spec.type === 'ImportSpecifier' &&
            spec.imported.type === 'Identifier' &&
            spec.imported.name === 'parseApiError'
          ) {
            return true
          }
        }
      }
      return false
    }

    function isMatchingErrorArg(
      arg: TSESTree.Node
    ): { source: string; fallback: TSESTree.Node | null } | null {
      // Match `X.error || '…'` or bare `X.error`.
      let expr: TSESTree.Node = arg
      let fallback: TSESTree.Node | null = null

      if (expr.type === 'LogicalExpression' && (expr.operator === '||' || expr.operator === '??')) {
        fallback = expr.right
        expr = expr.left
      }

      if (
        expr.type === 'MemberExpression' &&
        !expr.computed &&
        expr.property.type === 'Identifier' &&
        expr.property.name === 'error' &&
        expr.object.type === 'Identifier'
      ) {
        return { source: expr.object.name, fallback }
      }

      return null
    }

    return {
      NewExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'Error' ||
          node.arguments.length === 0
        ) {
          return
        }
        const firstArg = node.arguments[0]
        if (!firstArg) return

        const match = isMatchingErrorArg(firstArg)
        if (!match) return

        context.report({
          node: firstArg,
          messageId: 'useParseApiError',
          data: { source: match.source },
          fix(fixer) {
            if (!isParseApiErrorImported()) return null
            const sourceCode = context.sourceCode ?? context.getSourceCode()
            const fallbackText = match.fallback ? ` ?? ${sourceCode.getText(match.fallback)}` : ''
            return fixer.replaceText(firstArg, `parseApiError(${match.source}.data)${fallbackText}`)
          },
        })
      },
    }
  },
})
