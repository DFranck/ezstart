import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './create-rule.js'

/**
 * Forbidden import sources inside pay-sdk components — these would leak
 * monorepo coupling into a SDK that MUST stay externally publishable.
 *
 * - `@ezstart/logger`: components must surface errors via toast / props,
 *   never log via the monorepo logger (breaks agnosticism + adds a hard dep
 *   on `@ezstart/logger` to every consumer).
 * - `@ezstart/config`: env / port resolvers are monorepo-internal. The SDK
 *   accepts `apiUrl` explicitly via `createPayClient({ apiUrl })`.
 */
const FORBIDDEN_LOGGER_PATHS = /[\\/]packages[\\/]pay-sdk[\\/]src[\\/]components[\\/]/
const FORBIDDEN_CONFIG_PATHS = /[\\/]packages[\\/]pay-sdk[\\/]src[\\/]/

const FORBIDDEN_LOGGER_SOURCE = '@ezstart/logger'
const FORBIDDEN_CONFIG_SOURCE = '@ezstart/config'

/**
 * Blocks `import ... from '@ezstart/logger'` inside `packages/pay-sdk/src/components/`
 * and any `import ... from '@ezstart/config'` anywhere inside `packages/pay-sdk/src/`.
 *
 * Rationale: pay-sdk MUST stay 100 % agnostic of the @ezstart monorepo so it
 * can be `npm publish`-ed and consumed by external apps with zero coupling.
 *
 * Allowed alternatives:
 * - For error visibility in components → use `toast.error(...)` from
 *   `@ezstart/ui/utils`, or surface via an `onError` prop / Provider config.
 * - For URL resolution → require the consumer to pass `apiUrl` to
 *   `createPayClient({ apiUrl })` / `<PayProvider config={{ apiUrl }} />`.
 *
 * No autofix: removing the import on its own would leave dangling `logger.*`
 * calls.
 */
export const paySdk = createRule({
  name: 'pay-sdk',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid monorepo-coupling imports (@ezstart/logger, @ezstart/config) in @ezstart/pay-sdk source.',
    },
    schema: [],
    messages: {
      noLoggerInComponents:
        "Import of '@ezstart/logger' is forbidden in pay-sdk components — surface errors via toast.error or an onError prop instead. The SDK must stay agnostic of monorepo packages.",
      noConfig:
        "Import of '@ezstart/config' is forbidden in pay-sdk source — the SDK must accept `apiUrl` explicitly via `createPayClient({ apiUrl })` to remain externally publishable.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    const inComponents = FORBIDDEN_LOGGER_PATHS.test(filename)
    const inSrc = FORBIDDEN_CONFIG_PATHS.test(filename)

    if (!inSrc) return {}

    function check(value: unknown, sourceNode: TSESTree.Node) {
      if (typeof value !== 'string') return

      if (value === FORBIDDEN_LOGGER_SOURCE && inComponents) {
        context.report({
          node: sourceNode,
          messageId: 'noLoggerInComponents',
        })
        return
      }
      if (value === FORBIDDEN_CONFIG_SOURCE) {
        context.report({
          node: sourceNode,
          messageId: 'noConfig',
        })
      }
    }

    return {
      ImportDeclaration(node) {
        check(node.source.value, node.source)
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal') {
          check(node.source.value, node.source)
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0] &&
          node.arguments[0].type === 'Literal'
        ) {
          const arg = node.arguments[0]
          check(arg.value, arg)
        }
      },
    }
  },
})
