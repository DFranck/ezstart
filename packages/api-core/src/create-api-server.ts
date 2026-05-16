/**
 * Pre-configured API server for the @ezstart monorepo.
 *
 * Wires the agnostic `createBaseApiServer` factory with monorepo-specific
 * concerns:
 * - Port resolution via `@ezstart/config` (`getPort(appName, 'api')`).
 * - 3-tier CORS policy (permissive global + strict per-route on cookie
 *   paths). First-party origins are derived from `@ezstart/config`
 *   (`getAllowedOrigins`) unless the caller provides an explicit
 *   `cookieAuthAllowlist`.
 * - Logging through `@ezstart/logger`.
 *
 * See `.claude/rules/standard-saas-cors.md` for the CORS rationale.
 *
 * Consumers in the monorepo should import `createApiServer` from
 * `@ezstart/api-core` directly.
 */

import { getAllowedOrigins } from '@ezstart/config/cors'
import { getPort, type AppName } from '@ezstart/config/urls'
import { logger as monorepoLogger, type Logger } from '@ezstart/logger/server'
import jwt from 'jsonwebtoken'
import { createBaseApiServer } from './core/create-server.js'
import { createAuthMiddleware } from './core/middleware/auth.js'
import type { RequestHandler } from 'express'
import type {
  ApiServer,
  AuthenticatedUser,
  CookieAuthAllowlistEntry,
  ServerConfig,
  ServerLogger,
  TokenVerifier,
} from './core/types.js'

/**
 * Options accepted by `createApiServer`.
 */
export type ApiServerOptions = {
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
  /**
   * Path prefixes that set cookies and therefore require strict CORS.
   * Default: `[]` (no cookie routes — the API is fully Bearer / publishable-key
   * based).
   *
   * Example for `api-ezauth`:
   * ```ts
   * cookieAuthRoutes: [
   *   '/api/auth/login',
   *   '/api/auth/refresh',
   *   '/api/auth/logout',
   *   '/api/auth/oauth',
   * ]
   * ```
   */
  cookieAuthRoutes?: string[]
  /**
   * First-party origins allowed to call the cookie-auth routes. Accepts
   * exact strings or regex (useful for Vercel preview deploys).
   *
   * When omitted, falls back to `getAllowedOrigins(appName)` from
   * `@ezstart/config` (the monorepo first-party web URLs).
   *
   * Example:
   * ```ts
   * cookieAuthAllowlist: [
   *   'https://ezauth.ezstart.xyz',
   *   /^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/,
   *   'http://localhost:6111',
   * ]
   * ```
   */
  cookieAuthAllowlist?: readonly CookieAuthAllowlistEntry[]
}

/**
 * @deprecated Use `ApiServerOptions` instead. Will be removed in v1.0.0.
 */
export type EzstartServerOptions = ApiServerOptions

/**
 * Adapt the canonical {@link Logger} interface (from `@ezstart/logger`) to
 * the agnostic `ServerLogger` shape consumed by the api-core framework.
 *
 * Both interfaces are structurally compatible — `Logger` is a strict
 * superset (accepts `string | object` for the first arg) — so the wrapping
 * is just a thin "drop the second arg when undefined" passthrough that
 * keeps the on-the-wire log call identical to a hand-rolled
 * `pino.info(msg, data)` invocation.
 *
 * @internal
 */
function adaptLogger(source: Logger): ServerLogger {
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
 * import { createApiServer, startServer } from '@ezstart/api-core'
 *
 * const { app, config } = createApiServer('myapp', {
 *   rateLimit: { preset: 'standard' },
 * })
 *
 * app.get('/api/hello', (_req, res) => res.json({ ok: true }))
 * ```
 */
export function createApiServer(appName: AppName, options: ApiServerOptions = {}): ApiServer {
  const port =
    options.port ??
    (process.env.PORT ? Number.parseInt(process.env.PORT, 10) : getPort(appName, 'api'))
  const logger = options.logger ?? adaptLogger(monorepoLogger)

  const cookieAuthRoutes = options.cookieAuthRoutes ?? []
  // When the caller doesn't supply an explicit allowlist, fall back to the
  // monorepo first-party origins (same-app + declared consumers). This keeps
  // the previous behaviour for apps that haven't been migrated yet.
  const cookieAuthAllowlist =
    options.cookieAuthAllowlist ?? (cookieAuthRoutes.length > 0 ? getAllowedOrigins(appName) : [])

  return createBaseApiServer({
    port,
    serviceName: appName,
    // Note: `cors` is intentionally omitted so the 3-tier defaults kick in
    // inside `createBaseApiServer`. See .claude/rules/standard-saas-cors.md.
    cookieAuthRoutes,
    cookieAuthAllowlist,
    rateLimit: options.rateLimit ?? { preset: 'standard' },
    auth: options.auth,
    db: options.db,
    rawBodyRoutes: options.rawBodyRoutes,
    logger,
  })
}

/**
 * @deprecated Use `createApiServer` instead. Will be removed in v1.0.0.
 */
export const createEzstartServer = createApiServer

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
 * 2. Verifies tokens with `jsonwebtoken` (HS256). The token is read from
 *    either the `Authorization: Bearer <token>` header (checked first) OR
 *    the `ezauth_token` httpOnly cookie (set by ezauth login) as fallback.
 * 3. Returns `{ authMiddleware, optionalAuthMiddleware }` — the legacy names
 *    expected by all monorepo apps.
 *
 * @example
 * ```ts
 * import { createApiAuth } from '@ezstart/api-core'
 *
 * export const { authMiddleware, optionalAuthMiddleware } = createApiAuth()
 * ```
 */
export function createApiAuth(jwtSecret?: string): {
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

/**
 * @deprecated Use `createApiAuth` instead. Will be removed in v1.0.0.
 */
export const createEzstartAuth = createApiAuth
