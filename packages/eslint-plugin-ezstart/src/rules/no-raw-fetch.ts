import { createRule } from './create-rule.js'

const APP_WEB_PATH = /[\\/]apps[\\/][^\\/]+[\\/]web[\\/]src[\\/]/
const NEXT_ROUTE_HANDLER_PATH = /[\\/]apps[\\/][^\\/]+[\\/]web[\\/](src[\\/])?app[\\/]api[\\/]/

/**
 * Disallows direct calls to the global `fetch(...)` inside
 * `apps/<app>/web/src/**\/*.{ts,tsx}` source files.
 *
 * Rationale:
 * - App code must call `apiCall()` (internal APIs) or `fetchExternal()`
 *   (3rd-party) so auth, error envelopes, retries and logging stay centralized.
 * - Next.js route handlers (`app/api/**`) legitimately proxy external services
 *   and are allowed to use `fetch` directly.
 * - `fetchExternal(...)` calls are recognized by name and never flagged.
 *
 * No autofix: rewriting a `fetch()` call safely needs human judgement
 * (is this internal? 3rd-party? what envelope is expected?).
 */
export const noRawFetch = createRule({
  name: 'no-raw-fetch',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw fetch() in app web code. Use apiCall() for internal APIs or fetchExternal() for 3rd-party.',
    },
    schema: [],
    messages: {
      rawFetch:
        'Raw fetch() forbidden in app code — use apiCall() for internal APIs or fetchExternal() for 3rd-party.',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    const isAppWeb = APP_WEB_PATH.test(filename)
    const isRouteHandler = NEXT_ROUTE_HANDLER_PATH.test(filename)

    if (!isAppWeb || isRouteHandler) {
      return {}
    }

    return {
      CallExpression(node) {
        const callee = node.callee
        // Bare `fetch(...)` call.
        if (callee.type === 'Identifier' && callee.name === 'fetch') {
          context.report({ node: callee, messageId: 'rawFetch' })
          return
        }
        // `window.fetch(...)` / `globalThis.fetch(...)` / `self.fetch(...)`.
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'fetch' &&
          callee.object.type === 'Identifier' &&
          (callee.object.name === 'window' ||
            callee.object.name === 'globalThis' ||
            callee.object.name === 'self')
        ) {
          context.report({ node: callee.property, messageId: 'rawFetch' })
        }
      },
    }
  },
})
