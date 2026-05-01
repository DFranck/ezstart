/**
 * Deprecated route middleware — RFC 8594 HTTP deprecation signaling.
 *
 * Server-side counterpart to the browser-side `useDeprecationWarning()` hook
 * in `@ezstart/ui`. While the browser hook surfaces deprecated *components*
 * to the developer at mount time, this middleware surfaces deprecated *API
 * endpoints* to API consumers via standard HTTP headers (visible in any
 * client tooling: curl, Postman, error trackers, browser devtools).
 *
 * Headers set per RFC 8594 ("Indicating the Sunset HTTP Header Field") and
 * RFC 7234 §5.5 (`Warning` header):
 *
 * - `Deprecation: true` — always set, marks the endpoint as deprecated
 * - `Sunset: <ISO date>` — when the endpoint will be removed (optional)
 * - `Warning: 299 - "Endpoint deprecated, use <replacement>"` — human-
 *   readable migration hint (optional, set when `replacement` provided)
 * - `Link: <url>; rel="sunset"` — link to migration docs (optional)
 *
 * The middleware also emits a structured warn log via the injected
 * `logger`. The log entry surfaces in the configured log sink (Pino →
 * stdout in dev, Logtail/Better Stack/Sentry in prod) so platform
 * operators can track real-world usage of deprecated endpoints and plan
 * sunset timelines based on actual call volumes.
 *
 * Defensive notes:
 *
 * - The middleware NEVER blocks the request — it always calls `next()`.
 *   A deprecated endpoint must keep responding identically until the
 *   `Sunset` date passes; the warning is purely informational.
 * - The default logger is a silent no-op (industry convention for
 *   agnostic libraries — callers opt-in to observability by passing a
 *   logger or a custom `log` callback).
 * - The custom `log` callback takes precedence over the injected logger
 *   when both are provided (useful in tests and bespoke transports).
 *
 * @module @ezstart/api-core/middleware/deprecated-route
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { silentLogger } from '../internal/logger.js'
import type { ServerLogger } from '../types.js'

/**
 * Structured payload emitted to the configured logger / `log` callback
 * each time a deprecated route is hit.
 */
export type DeprecatedRouteLogEntry = {
  /** Method + path of the deprecated route, e.g. `'GET /api/v1/users'`. */
  deprecated: string
  /** Recommended replacement endpoint, when configured. */
  replacement?: string
  /** ISO 8601 sunset date, when configured. */
  sunset?: string
  /** Caller IP address (best-effort, behind any proxy headers Express trusts). */
  ip?: string
  /** Caller `User-Agent` header, when present. */
  userAgent?: string
}

/**
 * Configuration for {@link deprecatedRoute}.
 */
export interface DeprecatedRouteOptions {
  /**
   * Replacement endpoint, e.g. `'GET /api/v2/users'`. Surfaced in the
   * `Warning` HTTP header and in the structured log entry. Optional —
   * useful when the replacement is not a single endpoint (e.g. the
   * route is being removed entirely).
   */
  replacement?: string
  /**
   * ISO 8601 date when the route will be removed (e.g. `'2026-12-01'`).
   * Surfaced as the `Sunset` HTTP header. Per the deprecation policy in
   * `standard-saas-data.md` §2 this should be at least 90 days in the
   * future to give consumers reasonable migration time.
   */
  sunset?: string
  /**
   * URL pointing to migration documentation. Surfaced as a `Link` header
   * with `rel="sunset"` so client tooling can present the link inline.
   */
  link?: string
  /**
   * Optional structured logger. Defaults to a silent no-op. Pass
   * `logger` from `@ezstart/logger/server` (or any compatible
   * `ServerLogger`) to surface deprecation events to your log sink /
   * error tracker.
   */
  logger?: ServerLogger
  /**
   * Override the logger called when the route is hit. When provided,
   * takes precedence over `logger`. Useful in tests or to route
   * deprecation events to a custom transport (e.g. a metrics counter).
   */
  log?: (entry: DeprecatedRouteLogEntry) => void
}

/**
 * Express middleware that marks a route as deprecated per RFC 8594.
 *
 * Sets HTTP headers visible to all clients:
 * - `Sunset: <ISO date>` (when removal happens)
 * - `Deprecation: true`
 * - `Warning: 299 - "Endpoint deprecated, use <replacement>"`
 * - `Link: <url>; rel="sunset"` (docs)
 *
 * Logs a structured warn entry via the injected logger / `log` callback
 * with route + caller details for observability (visible in Sentry /
 * Better Stack once activated).
 *
 * The middleware always calls `next()` — it never blocks the request.
 *
 * @example
 * ```ts
 * import { deprecatedRoute } from '@ezstart/api-core'
 * import { logger } from '@ezstart/logger/server'
 *
 * router.get(
 *   '/v1/users',
 *   deprecatedRoute({
 *     replacement: 'GET /api/v2/users',
 *     sunset: '2026-12-01',
 *     link: 'https://docs.ezstart.xyz/migration/v2',
 *     logger,
 *   }),
 *   listUsersV1
 * )
 * ```
 */
export function deprecatedRoute(opts: DeprecatedRouteOptions = {}): RequestHandler {
  const logger = opts.logger ?? silentLogger

  return function deprecatedRouteMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (opts.sunset) res.setHeader('Sunset', opts.sunset)
    res.setHeader('Deprecation', 'true')
    if (opts.replacement) {
      res.setHeader('Warning', `299 - "Endpoint deprecated, use ${opts.replacement}"`)
    }
    if (opts.link) {
      res.setHeader('Link', `<${opts.link}>; rel="sunset"`)
    }

    const entry: DeprecatedRouteLogEntry = {
      deprecated: `${req.method} ${req.path}`,
      replacement: opts.replacement,
      sunset: opts.sunset,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    }

    if (opts.log) {
      opts.log(entry)
    } else {
      logger.warn('Deprecated endpoint called', entry)
    }

    next()
  }
}
