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
import type { HealthCheck } from './core/health.js'
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
  /**
   * Extra deep-health checks executed on every `/health/deep` poll, in
   * addition to the built-in DB ping derived from {@link ApiServerOptions.db}.
   *
   * See pre-built factories in `@ezstart/api-core` —
   * {@link createMongoosePingCheck}, {@link createStripeBalanceCheck},
   * {@link createResendCheck}, {@link createGeminiCheck},
   * {@link createOpenAICheck}, {@link createAnthropicCheck},
   * {@link createHttpCheck}.
   */
  deepHealthChecks?: HealthCheck[]
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
    deepHealthChecks: options.deepHealthChecks,
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

/** Canonical "uninitialized" ObjectId — never represents a real document. */
const NULL_OBJECT_ID = '000000000000000000000000'

/**
 * Strict ObjectId validator. Accepts a 24-char lowercase-hex string and
 * rejects the canonical all-zero ObjectId, which is the value Mongoose
 * returns for an uninitialized `_id` and should never identify a real
 * authenticated user (M3 — adversarial audit 2026-05-15).
 *
 * @internal
 */
export function isValidObjectId(s: string): boolean {
  if (!OBJECT_ID_REGEX.test(s)) return false
  // Reject the canonical "uninitialized" ObjectId — it's never a real user.
  if (s === NULL_OBJECT_ID) return false
  return true
}

/**
 * Build an `AuthenticatedUser` from a decoded JWT payload.
 * Returns `null` when the payload does not contain a valid userId.
 */
function buildUserFromDecoded(decoded: Record<string, unknown>): AuthenticatedUser | null {
  const userId = (decoded.userId || decoded.sub || decoded.id) as string | undefined
  if (!userId || !isValidObjectId(userId)) return null
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
 * Options accepted by `createApiAuth` (preferred form).
 */
export type CreateApiAuthOptions = {
  /** Explicit JWT secret. Defaults to `process.env.JWT_SECRET`. */
  jwtSecret?: string
  /**
   * Expected `iss` claim. When set, `jwt.verify` enforces it; tokens with
   * a mismatched or missing issuer are rejected as 401. When unset
   * (default), the `iss` claim is not checked — preserves prior behaviour
   * (L1 — adversarial audit 2026-05-15).
   */
  issuer?: string | string[]
  /**
   * Expected `aud` claim. When set, `jwt.verify` enforces it; tokens with
   * a mismatched or missing audience are rejected as 401. When unset
   * (default), the `aud` claim is not checked.
   */
  audience?: string | string[]
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
 * **Backward compat**: accepts either a string (legacy — JWT secret only) or
 * an options object. Callers passing nothing or a string get the previous
 * behaviour unchanged (no `iss`/`aud` enforcement).
 *
 * @example
 * ```ts
 * import { createApiAuth } from '@ezstart/api-core'
 *
 * // Defaults — uses JWT_SECRET from env, no iss/aud check.
 * export const { authMiddleware } = createApiAuth()
 *
 * // Strict — enforces iss + aud claims (recommended for multi-tenant).
 * export const { authMiddleware } = createApiAuth({
 *   issuer: 'https://ezauth.ezstart.xyz',
 *   audience: ['ezpay', 'ezbill'],
 * })
 * ```
 */
export function createApiAuth(secretOrOptions?: string | CreateApiAuthOptions): {
  authMiddleware: RequestHandler
  optionalAuthMiddleware: RequestHandler
} {
  const options: CreateApiAuthOptions =
    typeof secretOrOptions === 'string' ? { jwtSecret: secretOrOptions } : (secretOrOptions ?? {})

  const secret = options.jwtSecret ?? process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')

  // jsonwebtoken's VerifyOptions expects tuple types (`[string, ...string[]]`)
  // for `audience` / `issuer`, not bare `string[]`. Normalize non-empty arrays
  // to the tuple shape so our public API stays ergonomic (`string[]`) without
  // leaking lib internals to callers.
  const audience: jwt.VerifyOptions['audience'] | undefined =
    options.audience === undefined
      ? undefined
      : Array.isArray(options.audience)
        ? options.audience.length === 0
          ? undefined
          : ([options.audience[0], ...options.audience.slice(1)] as [string, ...string[]])
        : options.audience

  const issuer: jwt.VerifyOptions['issuer'] | undefined =
    options.issuer === undefined
      ? undefined
      : Array.isArray(options.issuer)
        ? options.issuer.length === 0
          ? undefined
          : ([options.issuer[0], ...options.issuer.slice(1)] as [string, ...string[]])
        : options.issuer

  const verifyToken: TokenVerifier = token => {
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        ...(issuer !== undefined ? { issuer } : {}),
        ...(audience !== undefined ? { audience } : {}),
      }) as Record<string, unknown>
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
