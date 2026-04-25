/**
 * Global error handler middleware.
 *
 * Registered as the LAST middleware in `createApiServer` (after every
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
import type { ServerLogger } from '../types.js'

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
}

/**
 * Build a global Express error handler.
 *
 * Register it as the LAST middleware in your server, after every router:
 *
 * @example
 * ```ts
 * import { createApiServer, createErrorHandler } from '@ezstart/api-core'
 *
 * const { app, logger } = createApiServer({ port: 3000 })
 * app.use('/api/items', itemsRouter)
 * app.use(createErrorHandler({ logger }))
 * ```
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}): ErrorRequestHandler {
  const { logger, isProd = process.env.NODE_ENV === 'production', preserveCors = true } = config

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
