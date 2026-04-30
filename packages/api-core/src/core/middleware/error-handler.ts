/**
 * Global error handler middleware.
 *
 * Registered as the LAST middleware in `createBaseApiServer` (after every
 * router and middleware). Handles all unhandled exceptions thrown by
 * upstream handlers/middlewares.
 *
 * Critical responsibilities:
 *
 * 1. Re-emit `Access-Control-Allow-Origin` / `Access-Control-Allow-Credentials`
 *    / `Vary` so the browser does not strip the error response (otherwise
 *    the CORS preflight succeeds but the actual response body is hidden by
 *    the browser, masking the real error from consumers).
 * 2. Log the error via the injected logger — never `console.*`.
 * 3. Respond with the canonical `sendError`-shaped envelope (`{ success:
 *    false, error: { message, code } }`) so consumers can parse with the
 *    exact same `parseApiError` they use for normal errors.
 * 4. Never leak stack traces or internal error details in production.
 */

import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import { captureException } from '../../observability/index.js'
import type { ServerLogger } from '../types.js'

/**
 * Optional callback invoked on every unhandled error BEFORE the response is
 * sent. Designed for app-level persistence (e.g. write the error to a local
 * `ErrorLog` Mongo collection so the admin dashboard can browse them
 * without depending on a third-party error tracker).
 *
 * Contract:
 * - Fire-and-forget — the handler does NOT await the returned promise.
 *   Implementations MUST swallow their own errors (never throw, never
 *   reject) so the error pipeline cannot cascade.
 * - Called with the original `err` + the `req` so the implementation can
 *   capture user context, route, IP, etc.
 *
 * See `apps/ezauth/api/src/services/error-log.service.ts` for a reference
 * implementation.
 */
export type ErrorPersistCallback = (err: unknown, req: Request) => void | Promise<void>

/**
 * Configuration accepted by `createErrorHandler`.
 */
export type ErrorHandlerConfig = {
  /** Logger used to record unhandled errors. Falls back to `silentLogger` style. */
  logger?: ServerLogger
  /**
   * When `true`, the response body omits the stack trace and the message
   * is sanitized to `'Internal server error'`. Default: derived from
   * `NODE_ENV === 'production'`.
   */
  isProd?: boolean
  /**
   * When `true` (default), the handler reflects the request `Origin` back
   * in `Access-Control-Allow-Origin` + sets `credentials: true` so the
   * browser does not block the error response. Set to `false` only if you
   * have a specific reason to suppress CORS on errors.
   */
  preserveCors?: boolean
  /**
   * Optional pluggable persistence callback for app-level error storage.
   * Invoked BEFORE the response is sent + BEFORE Sentry capture. Always
   * fire-and-forget — see {@link ErrorPersistCallback} for the contract.
   *
   * @example
   * ```ts
   * createErrorHandler({
   *   persistError: (err, req) => logErrorToDb({ err, req }),
   * })
   * ```
   */
  persistError?: ErrorPersistCallback
}

/**
 * Build a global Express error handler.
 *
 * Register it as the LAST middleware in your server, after every router:
 *
 * @example
 * ```ts
 * import { createBaseApiServer, createErrorHandler } from '@ezstart/api-core'
 *
 * const { app, logger } = createBaseApiServer({ port: 3000 })
 * app.use('/api/items', itemsRouter)
 * app.use(createErrorHandler({ logger }))
 * ```
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}): ErrorRequestHandler {
  const {
    logger,
    isProd = process.env.NODE_ENV === 'production',
    preserveCors = true,
    persistError,
  } = config

  return function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    // Re-emit CORS headers so browsers do not strip the error response.
    // We mirror exactly what `createPermissiveCorsMiddleware` would have
    // emitted on a successful response — same origin reflection logic.
    if (preserveCors) {
      const origin = req.headers.origin
      if (typeof origin === 'string' && origin.length > 0) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Vary', 'Origin')
      }
    }

    // Log via the injected logger — never console.*. The error payload is
    // intentionally rich (path, method) so observability tooling can group
    // errors by route.
    if (logger?.error) {
      logger.error('Unhandled error in request', {
        err,
        path: req.path,
        method: req.method,
      })
    }

    // App-level persistence callback (fire-and-forget). Runs BEFORE Sentry
    // capture so that — if the dev only wires the local stopgap — at least
    // the error reaches MongoDB even if Sentry is misconfigured. The callback
    // contract guarantees it never throws (see ErrorPersistCallback docs).
    if (persistError) {
      try {
        const result = persistError(err, req)
        if (result && typeof (result as Promise<void>).then === 'function') {
          ;(result as Promise<void>).catch(persistErr => {
            // The contract says persistError must swallow its own errors —
            // if it didn't, log here so the error pipeline doesn't cascade.
            if (logger?.warn) {
              logger.warn('persistError callback rejected (contract violation)', {
                err: persistErr,
              })
            }
          })
        }
      } catch (persistErr) {
        if (logger?.warn) {
          logger.warn('persistError callback threw (contract violation)', { err: persistErr })
        }
      }
    }

    // Capture to Sentry (no-op when SENTRY_DSN not set — initSentry returns
    // early). This is the ONE place we capture from — no auto-instrumentation
    // (cf. observability/sentry-init.ts and the 2026-04-25 incident note).
    captureException(err, {
      path: req.path,
      method: req.method,
      userId: req.userId,
    })

    // Respect already-sent responses (e.g. an error fired after streaming
    // started — there is nothing we can do, just bail).
    if (res.headersSent) {
      return
    }

    // Sanitize the message + stack for production. In development the full
    // error is exposed to ease debugging.
    const message = isProd || !(err instanceof Error) ? 'Internal server error' : err.message
    const stack = isProd ? undefined : err instanceof Error ? err.stack : undefined

    const body: {
      success: false
      error: {
        message: string
        code: string
        stack?: string
      }
    } = {
      success: false,
      error: {
        message: isProd ? 'Internal server error' : message,
        code: 'INTERNAL_ERROR',
      },
    }
    if (stack) {
      body.error.stack = stack
    }

    res.status(500).json(body)
  }
}
