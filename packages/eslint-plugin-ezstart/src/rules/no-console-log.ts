import { createRule } from './create-rule.js'

/**
 * Paths where console.log / console.warn / console.error are allowed.
 * - Tests
 * - Scripts (seed, generators, CLI)
 * - Config files at package root
 * - bin/ entry points
 * - The logger itself (it wraps console)
 */
const ALLOWED_PATHS = [
  /[\\/]__tests__[\\/]/,
  /[\\/]__mocks__[\\/]/,
  /\.(test|spec)\.[jt]sx?$/,
  /[\\/]scripts[\\/]/,
  /[\\/]bin[\\/]/,
  /[\\/]packages[\\/]logger[\\/]/,
  /\.config\.(m|c)?[jt]sx?$/,
  /vitest\.config\.(m|c)?[jt]sx?$/,
  /vite\.config\.(m|c)?[jt]sx?$/,
  /next\.config\.(m|c)?[jt]sx?$/,
  /tailwind\.config\.(m|c)?[jt]sx?$/,
]

const FORBIDDEN_METHODS = new Set(['log', 'warn', 'error', 'info', 'debug'])

/**
 * Disallows raw `console.log` / `console.warn` / `console.error` etc. in
 * source files. Forces using `@ezstart/logger` for consistent leveled logging.
 *
 * Allowed:
 * - Tests (`__tests__/`, `*.test.ts`, `*.spec.ts`)
 * - Scripts (`scripts/`, `bin/`)
 * - Config files (`*.config.ts`)
 * - `packages/logger/` itself
 *
 * No autofix: the replacement depends on the intent (logger.info vs
 * logger.warn vs logger.error) and the package context (server vs client).
 */
export const noConsoleLog = createRule({
  name: 'no-console-log',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow console.log/warn/error/info/debug in src. Use @ezstart/logger instead.',
    },
    schema: [],
    messages: {
      forbidden:
        "'console.{{method}}' is forbidden — use @ezstart/logger (logger.info, logger.warn, logger.error, logger.debug) instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (ALLOWED_PATHS.some(re => re.test(filename))) {
      return {}
    }

    return {
      MemberExpression(node) {
        if (
          node.computed ||
          node.object.type !== 'Identifier' ||
          node.object.name !== 'console' ||
          node.property.type !== 'Identifier' ||
          !FORBIDDEN_METHODS.has(node.property.name)
        ) {
          return
        }
        context.report({
          node,
          messageId: 'forbidden',
          data: { method: node.property.name },
        })
      },
    }
  },
})
