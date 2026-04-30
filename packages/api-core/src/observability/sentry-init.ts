/**
 * Sentry initialization helper for backend error tracking.
 *
 * Uses `@sentry/node-core` with ZERO auto-integrations to avoid the
 * 2026-04-25 incident where `@sentry/node` v10+ OTEL HTTP/Express
 * auto-instrumentation broke CORS on Railway managed Node by intercepting
 * `setHeader` calls and wrapping native errors as `NativeCommandError` /
 * leaking 500s on every cross-origin request carrying a non-empty `Origin`.
 *
 * We capture errors **manually** via `captureException` from our error
 * middleware (see `core/middleware/error-handler.ts`). This keeps full
 * control over what gets sent to Sentry — no surprise auto-instrumentation.
 *
 * Design contract:
 * - **No-op when DSN is empty** — `initSentry` returns early when neither
 *   `opts.dsn` nor `process.env.SENTRY_DSN` is set. Callers can always
 *   invoke `initSentry({ serviceName: 'foo' })` regardless of env config.
 * - **Safe `captureException`** — works whether Sentry is initialized or not
 *   (delegates to the SDK's own no-op behaviour pre-init).
 * - **Zero auto-integrations** — `integrations: []` is mandatory. Do NOT add
 *   `Sentry.expressIntegration()`, `Sentry.httpIntegration()`, etc. — they
 *   bring back the OTEL hook that triggered the 2026-04-25 incident.
 *
 * @see ../../.claude/rules/standard-saas-observability.md §1
 */

import * as Sentry from '@sentry/node-core'

/** Configuration accepted by `initSentry`. */
export type InitSentryOptions = {
  /** Logical service name (e.g. `'ezauth'`). Reported as Sentry `serverName`. */
  serviceName: string
  /** Sentry DSN. Falls back to `process.env.SENTRY_DSN`. */
  dsn?: string
  /** Defaults to `process.env.DEPLOY_ENV ?? 'development'`. */
  environment?: string
  /**
   * Defaults to `process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA`.
   * When unset, Sentry omits release tagging (errors group across deploys).
   */
  release?: string
  /**
   * Tracing sample rate (0..1). Defaults to `0.1` (10%). Pass `0` to disable
   * tracing entirely. Tracing in `@sentry/node-core` works without OTEL —
   * spans must be created manually via `Sentry.startSpan`.
   */
  tracesSampleRate?: number
}

/**
 * Initialize Sentry for backend error tracking. **No-op when DSN is empty.**
 *
 * Call this BEFORE any server framework wires up (e.g. before `createApiServer`)
 * so the error handler middleware can safely delegate to `captureException`.
 *
 * @example
 * ```ts
 * import { initSentry, createApiServer } from '@ezstart/api-core'
 *
 * initSentry({ serviceName: 'ezauth' })
 * const server = createApiServer('ezauth', { ... })
 * ```
 */
export function initSentry(opts: InitSentryOptions): void {
  const dsn = opts.dsn ?? process.env.SENTRY_DSN
  if (!dsn) return // no-op when DSN empty — caller can always call this safely

  Sentry.init({
    dsn,
    environment: opts.environment ?? process.env.DEPLOY_ENV ?? 'development',
    release:
      opts.release ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA,
    serverName: opts.serviceName,
    tracesSampleRate: opts.tracesSampleRate ?? 0.1,
    // ZERO auto-integrations — manual capture only. Adding Express / HTTP
    // integrations here re-introduces the OTEL hook that broke CORS in the
    // 2026-04-25 incident.
    integrations: [],
  })
}

/**
 * Capture an exception manually. **Safe no-op when Sentry is not initialized.**
 *
 * Call this from the global error middleware or any catch block where you
 * want to surface the error to Sentry. Wraps the native call in a `try/catch`
 * so a broken Sentry transport never crashes the request lifecycle.
 *
 * @example
 * ```ts
 * import { captureException } from '@ezstart/api-core'
 *
 * try {
 *   await dangerousOperation()
 * } catch (err) {
 *   captureException(err, { userId: req.userId, route: req.path })
 *   throw err
 * }
 * ```
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined)
  } catch {
    // Defensive — never let a broken Sentry transport crash the caller.
  }
}
