/**
 * Request-scoped context propagation via Node `AsyncLocalStorage`.
 *
 * Used to surface a few request-derived values (currently `derivedMode` for the
 * test/live mode partitioning, and the calling user id) to downstream code that
 * is too deeply nested to receive an explicit `req` reference — typically
 * Mongoose pre-find hooks (see `testModeScopePlugin` in each app's middleware
 * directory) and other model-level behaviours.
 *
 * The store is intentionally narrow. Anything that does NOT need to traverse a
 * Mongoose hook boundary should be passed via `req` directly.
 *
 * ## Usage
 *
 * Wire the wrapping middleware once near the top of the middleware chain
 * (after auth + `attachDerivedMode`, before route handlers):
 *
 * ```ts
 * import { withRequestContextMiddleware } from '@ezstart/api-core'
 * app.use(verifyTokenMiddleware)
 * app.use(attachDerivedMode)
 * app.use(withRequestContextMiddleware) // <- here
 * app.use('/api', routes)
 * ```
 *
 * Then read it from any leaf code:
 *
 * ```ts
 * import { getRequestContext } from '@ezstart/api-core'
 * const ctx = getRequestContext()
 * if (ctx?.derivedMode === 'test') { ... }
 * ```
 *
 * ## Bypassing the context (cron, migrations, seeders)
 *
 * Code that runs OUTSIDE a request lifecycle (cron jobs, migration scripts,
 * seeders) will see `getRequestContext()` return `undefined`. Mongoose hooks
 * SHOULD treat that case as "no scope filter" — see `testModeScopePlugin`.
 *
 * Hand-written queries that need to opt out from inside a request (rare —
 * superadmin "view live across both modes") MUST set the explicit
 * `{ skipTestModeScope: true }` query option, NOT mutate the context.
 *
 * @module @ezstart/api-core/context/request-context
 */

import { AsyncLocalStorage } from 'node:async_hooks'

/** Mode derived from the API key prefix (test vs live). */
export type DerivedMode = 'test' | 'live'

/** Per-request data propagated through async boundaries. */
export interface RequestContext {
  /**
   * Effective mode for the current request. Set by `attachDerivedMode` from
   * the API key prefix. Cookie-authenticated dashboard requests default to
   * `'live'` — superadmin override via `?mode=test|live` is honoured (see
   * `attachDerivedMode`).
   */
  derivedMode?: DerivedMode
  /** Stringified `auth_users._id` of the calling user, if authenticated. */
  userId?: string
}

/**
 * Module-level `AsyncLocalStorage` instance. Exposed only to the wrapping
 * middleware and the `getRequestContext` reader; never mutate it directly.
 *
 * @internal
 */
export const requestContext: AsyncLocalStorage<RequestContext> =
  new AsyncLocalStorage<RequestContext>()

/**
 * Run `fn` inside an `AsyncLocalStorage` frame populated with `ctx`. Any code
 * (including async continuations) executed during `fn`'s lifetime can read the
 * context via {@link getRequestContext}.
 *
 * Usually consumers don't call this directly — they use
 * {@link withRequestContextMiddleware} which wraps each Express request.
 *
 * @example
 * withRequestContext({ derivedMode: 'test', userId: 'u_123' }, () => {
 *   const ctx = getRequestContext()
 *   // ctx.derivedMode === 'test'
 * })
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn)
}

/**
 * Read the current request context. Returns `undefined` when called outside an
 * active request frame (cron, migration, top-level boot code).
 *
 * @example
 * const ctx = getRequestContext()
 * if (!ctx) {
 *   // We're in a background job — no scope filter applies.
 *   return next()
 * }
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore()
}
