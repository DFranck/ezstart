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
import jwt from 'jsonwebtoken'
import { createApiServer } from './core/create-server.js'
import { createAuthMiddleware } from './core/middleware/auth.js'
import type { RequestHandler } from 'express'
import type {
  ApiServer,
  AuthenticatedUser,
  ServerConfig,
  ServerLogger,
  TokenVerifier,
} from './core/types.js'

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

// ---------------------------------------------------------------------------
// Backward-compatible auth convenience (monorepo only)
// ---------------------------------------------------------------------------

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

/**
 * Build an `AuthenticatedUser` from a decoded JWT payload.
 * Returns `null` when the payload does not contain a valid userId.
 */
function buildUserFromDecoded(decoded: Record<string, unknown>): AuthenticatedUser | null {
  const userId = (decoded.userId || decoded.sub || decoded.id) as string | undefined
  if (!userId || !OBJECT_ID_REGEX.test(userId)) return null
  return {
    userId,
    email: decoded.email as string | undefined,
    username: decoded.username as string | undefined,
    apps: decoded.apps as string[] | undefined,
    globalRoles: decoded.globalRoles as string[] | undefined,
    appRoles: decoded.appRoles as Record<string, string[]> | undefined,
    permissions: decoded.permissions as string[] | undefined,
    features: decoded.features as string[] | undefined,
  }
}

/**
 * Monorepo convenience that mirrors the old `express-core` behaviour:
 *
 * 1. Reads `JWT_SECRET` from the environment (or accepts an explicit override).
 * 2. Verifies tokens with `jsonwebtoken` (HS256, Bearer header + cookie + dev
 *    `X-User-Id` fallback).
 * 3. Returns `{ authMiddleware, optionalAuthMiddleware }` — the legacy names
 *    expected by all monorepo apps.
 *
 * @example
 * ```ts
 * import { createEzstartAuth } from '@ezstart/api-core'
 *
 * export const { authMiddleware, optionalAuthMiddleware } = createEzstartAuth()
 * ```
 */
export function createEzstartAuth(jwtSecret?: string): {
  authMiddleware: RequestHandler
  optionalAuthMiddleware: RequestHandler
} {
  const secret = jwtSecret ?? process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')

  const verifyToken: TokenVerifier = token => {
    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as Record<
        string,
        unknown
      >
      return buildUserFromDecoded(decoded)
    } catch {
      // Token invalid — let the core middleware handle the 401
      return null
    }
  }

  const { requireAuth, optionalAuth } = createAuthMiddleware({
    verifyToken,
    cookieName: 'ezauth_token',
  })

  return { authMiddleware: requireAuth, optionalAuthMiddleware: optionalAuth }
}
