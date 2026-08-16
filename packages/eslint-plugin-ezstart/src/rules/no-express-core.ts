import { createRule } from './create-rule.js'

const DEPRECATED_PACKAGE = '@ezstart/express-core'
const REPLACEMENT_PACKAGE = '@ezstart/api-core'

/**
 * Blocks any `import ... from '@ezstart/express-core'`.
 *
 * `@ezstart/express-core` was superseded by `@ezstart/api-core`. The rule
 * provides an autofix that rewrites the module specifier in place — imported
 * bindings usually keep the same names (`connectToMongo`, `createApp`, …).
 */
export const noExpressCore = createRule({
  name: 'no-express-core',
  meta: {
    type: 'problem',
    docs: {
      description: `Disallow imports from ${DEPRECATED_PACKAGE}; use ${REPLACEMENT_PACKAGE} instead.`,
    },
    fixable: 'code',
    schema: [],
    messages: {
      deprecated: `Import from '${REPLACEMENT_PACKAGE}' instead of the deprecated '${DEPRECATED_PACKAGE}'. See migration guide in packages/api-core/README.md.`,
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
      // Covers `import('@ezstart/express-core')` dynamic imports + `require(...)`.
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
