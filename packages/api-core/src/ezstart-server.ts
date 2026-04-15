/**
 * Pre-configured API server for the @ezstart monorepo.
 *
 * Wires the agnostic `createApiServer` factory with monorepo-specific
 * concerns:
 * - Port resolution via `@ezstart/config` (`getPort(appName, 'api')`).
 * - CORS auto-configured from `@ezstart/config` (`getAllowedOrigins`).
 * - Logging through `@ezstart/logger`.
 *
 * Consumers in the monorepo should import `createEzstartServer` from
 * `@ezstart/api-core` directly.
 */

import { getAllowedOrigins } from '@ezstart/config/cors'
import { getPort, type AppName } from '@ezstart/config/urls'
import { logger as monorepoLogger } from '@ezstart/logger/server'
import { createApiServer } from './core/create-server.js'
import type { ApiServer, ServerConfig, ServerLogger, TokenVerifier } from './core/types.js'

/**
 * Options accepted by `createEzstartServer`.
 */
export type EzstartServerOptions = {
  /**
   * Override the port resolved from `@ezstart/config`. Useful for tests or
   * ad-hoc deployments.
   */
  port?: number
  /** Override the rate limit preset (default `'standard'`). */
  rateLimit?: ServerConfig['rateLimit']
  /** Token verifier — enables auth middleware downstream. */
  auth?: { verifyToken: TokenVerifier }
  /** DB connector — awaited on `startServer()`. */
  db?: ServerConfig['db']
  /** Raw body routes (webhooks). */
  rawBodyRoutes?: string[]
  /** Logger override (default: `@ezstart/logger`). */
  logger?: ServerLogger
}

type LoggerLike = {
  info: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  warn: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  error: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  debug: (msgOrObj: string | object, dataOrMsg?: unknown) => void
}

function adaptLogger(source: LoggerLike): ServerLogger {
  return {
    info: (msg, data) => (data !== undefined ? source.info(msg, data) : source.info(msg)),
    warn: (msg, data) => (data !== undefined ? source.warn(msg, data) : source.warn(msg)),
    error: (msg, data) => (data !== undefined ? source.error(msg, data) : source.error(msg)),
    debug: (msg, data) => (data !== undefined ? source.debug(msg, data) : source.debug(msg)),
  }
}

/**
 * Build an Express app pre-configured for the @ezstart monorepo.
 *
 * @example
 * ```ts
 * import { createEzstartServer, startServer } from '@ezstart/api-core'
 *
 * const { app, config } = createEzstartServer('myapp', {
 *   rateLimit: { preset: 'standard' },
 * })
 *
 * app.get('/api/hello', (_req, res) => res.json({ ok: true }))
 * ```
 */
export function createEzstartServer(
  appName: AppName,
  options: EzstartServerOptions = {}
): ApiServer {
  const port =
    options.port ??
    (process.env.PORT ? Number.parseInt(process.env.PORT, 10) : getPort(appName, 'api'))
  const origins = getAllowedOrigins(appName)
  const logger = options.logger ?? adaptLogger(monorepoLogger)

  return createApiServer({
    port,
    serviceName: appName,
    cors: { origins, credentials: true },
    rateLimit: options.rateLimit ?? { preset: 'standard' },
    auth: options.auth,
    db: options.db,
    rawBodyRoutes: options.rawBodyRoutes,
    logger,
  })
}
