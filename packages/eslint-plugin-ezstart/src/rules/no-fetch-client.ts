import { createRule } from './create-rule.js'

const DEPRECATED_PACKAGE = '@ezstart/fetch-client'
const REPLACEMENT_PACKAGE = '@ezstart/api-sdk'

/**
 * Blocks any `import ... from '@ezstart/fetch-client'`.
 *
 * `@ezstart/fetch-client` was superseded by `@ezstart/api-sdk`. The rule
 * provides an autofix that rewrites the module specifier in place — imported
 * bindings usually keep the same names (`apiCall`, `fetchExternal`, …).
 */
export const noFetchClient = createRule({
  name: 'no-fetch-client',
  meta: {
    type: 'problem',
    docs: {
      description: `Disallow imports from ${DEPRECATED_PACKAGE}; use ${REPLACEMENT_PACKAGE} instead.`,
    },
    fixable: 'code',
    schema: [],
    messages: {
      deprecated: `Package ${DEPRECATED_PACKAGE} is deprecated — use '${REPLACEMENT_PACKAGE}' instead.`,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === DEPRECATED_PACKAGE) {
          context.report({
            node: node.source,
            messageId: 'deprecated',
            fix(fixer) {
              return fixer.replaceText(node.source, `'${REPLACEMENT_PACKAGE}'`)
            },
          })
        }
      },
      // Covers `import('@ezstart/fetch-client')` dynamic imports + `require(...)`.
      ImportExpression(node) {
        if (node.source.type === 'Literal' && node.source.value === DEPRECATED_PACKAGE) {
          context.report({
            node: node.source,
            messageId: 'deprecated',
            fix(fixer) {
              return fixer.replaceText(node.source, `'${REPLACEMENT_PACKAGE}'`)
            },
          })
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0] &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === DEPRECATED_PACKAGE
        ) {
          const arg = node.arguments[0]
          context.report({
            node: arg,
            messageId: 'deprecated',
            fix(fixer) {
              return fixer.replaceText(arg, `'${REPLACEMENT_PACKAGE}'`)
            },
          })
        }
      },
    }
  },
})
