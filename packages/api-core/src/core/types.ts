/**
 * Core agnostic types for the API server framework.
 *
 * No coupling to `@ezstart/config`, `@ezstart/logger`, `mongoose`, `socket.io`
 * or any monorepo-specific concept. Consumers configure the server via
 * `createBaseApiServer(config)`.
 *
 * Wire-level primitives (`ApiMeta`, `ErrorPayload`, `SuccessResponse`, ...)
 * live in `@ezstart/api-contracts` — the single source of truth shared with
 * the client (`@ezstart/api-sdk`).
 */

import type { ApiMeta as ContractsApiMeta } from '@ezstart/api-contracts'

/**
 * Standard `meta` shape of paginated or envelope responses.
 *
 * Re-exported from `@ezstart/api-contracts` so client and server agree on the
 * exact wire shape.
 */
export type ApiMeta = ContractsApiMeta

/**
 * Minimal user payload extracted from a verified access token.
 *
 * Applications are free to extend via the open bucket — the core only relies
 * on `userId` to populate `req.userId`. Common monorepo fields (`apps`,
 * `globalRoles`, `appRoles`, `features`, ...) are declared as optional so
 * downstream consumers get proper inference without casting.
 */
export type AuthenticatedUser = {
  userId: string
  _id?: string
  email?: string
  username?: string
  roles?: string[]
  /** Global roles (monorepo convention: `['superadmin' | 'admin' | ...]`). */
  globalRoles?: string[]
  /** Per-app role map (monorepo convention). */
  appRoles?: Record<string, string[]>
  /** Apps the user has access to (monorepo convention). */
  apps?: string[]
  permissions?: string[]
  /** Feature flags granted to the user (monorepo convention). */
  features?: string[]
  /** Extra app-specific fields. */
  [key: string]: unknown
}

/**
 * Contract a token verifier must satisfy.
 *
 * The verifier is fully injected — the core has no idea whether it is JWT,
 * PASETO, opaque session lookup, etc. Return `null` for invalid tokens; the
 * middleware will respond with `401`.
 */
export type TokenVerifier = (
  token: string,
  kind: 'bearer' | 'cookie'
) => AuthenticatedUser | null | Promise<AuthenticatedUser | null>

/**
 * Optional logger. Defaults to a silent no-op implementation (industry
 * convention — callers opt-in by passing their own logger).
 */
export type ServerLogger = {
  info: (msg: string, data?: unknown) => void
  warn: (msg: string, data?: unknown) => void
  error: (msg: string, data?: unknown) => void
  debug: (msg: string, data?: unknown) => void
}

/**
 * Legacy CORS configuration. When `corsOrigins` is `'*'` every origin is
 * accepted (discouraged in production). Array form restricts to the listed
 * origins with `credentials: true`.
 *
 * @deprecated Prefer the 3-tier model exposed via `ServerConfig`:
 * permissive CORS is applied globally and `cookieAuthRoutes` /
 * `cookieAuthAllowlist` opt-in strict CORS on cookie-authenticated paths.
 * See `.claude/rules/standard-saas-cors.md`.
 */
export type CorsConfig =
  | '*'
  | {
      origins: string[]
      credentials?: boolean
      methods?: string[]
      allowedHeaders?: string[]
    }

/**
 * Entry in a strict CORS allowlist. Accepts an exact origin string or a
 * regex — regex is typically used for Vercel preview deploys.
 */
export type CookieAuthAllowlistEntry = string | RegExp

/**
 * Rate-limiter preset. The core ships four presets (standard / strict /
 * very-strict / moderate) and accepts fully custom overrides.
 */
export type RateLimitPreset = 'standard' | 'strict' | 'very-strict' | 'moderate'

/**
 * Configuration accepted by `createBaseApiServer`.
 */
export type ServerConfig = {
  /** Port to bind when `startServer()` is invoked. Required. */
  port: number
  /** Human-readable name used in logs / OpenAPI title. */
  serviceName?: string
  /**
   * Legacy CORS policy. Default `'*'`.
   *
   * @deprecated New code should rely on the 3-tier defaults:
   * permissive CORS (`*`) is applied globally and `cookieAuthRoutes` +
   * `cookieAuthAllowlist` opt-in strict CORS on cookie-auth paths. This
   * field is preserved to avoid a breaking change during the migration
   * window.
   */
  cors?: CorsConfig
  /**
   * Path prefixes that set cookies (Tier 3 — cookie-authenticated).
   * For every prefix listed here, a strict CORS middleware is registered
   * that reflects the origin only when it matches `cookieAuthAllowlist`
   * and sends `credentials: true`. All other paths keep the permissive
   * policy (`Access-Control-Allow-Origin: *`, `credentials: false`).
   *
   * @example
   * ```ts
   * cookieAuthRoutes: ['/api/auth/login', '/api/auth/refresh']
   * ```
   */
  cookieAuthRoutes?: string[]
  /**
   * First-party origins allowed to call the cookie-auth routes. Each entry
   * is either an exact string match or a regex (typically for Vercel
   * preview deploys). Required when `cookieAuthRoutes` is non-empty —
   * leaving it empty blocks all cross-origin cookie requests.
   *
   * @example
   * ```ts
   * cookieAuthAllowlist: [
   *   'https://ezauth.ezstart.xyz',
   *   /^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/,
   *   'http://localhost:6111',
   * ]
   * ```
   */
  cookieAuthAllowlist?: readonly CookieAuthAllowlistEntry[]
  /**
   * When set, `createBaseApiServer` returns an app with `createRateLimiter()`
   * already applied globally. Omit to apply rate limiting manually.
   */
  rateLimit?: {
    preset?: RateLimitPreset
    /** Per-request override (max / windowMs / skipPaths...). */
    options?: import('./middleware/rate-limit.js').RateLimitOptions
  }
  /** Optional token verifier — enables the auth middleware factory. */
  auth?: {
    verifyToken: TokenVerifier
  }
  /** Optional DB connector. The core never instantiates one — it just awaits it on boot. */
  db?: import('./db-connector.js').DbConnector
  /** Raw body routes (webhooks). Registered BEFORE the JSON parser. */
  rawBodyRoutes?: string[]
  /** Path for the health endpoint. Default `/health` (also mounts `/api/health` for compat). */
  healthPath?: string
  /** Path for the deep health endpoint. Default `/health/deep`. */
  deepHealthPath?: string
  /**
   * Custom checks executed when `/health/deep` is hit (in addition to the
   * built-in DB ping derived from {@link ServerConfig.db}, when present).
   *
   * Each check is invoked in parallel with a 5s timeout. A check that
   * throws or returns `{ status: 'down' }` flips the overall response to
   * 503; a check that returns `{ status: 'degraded' }` flips it to 200
   * with `status: 'degraded'`.
   *
   * @example
   * ```ts
   * deepHealthChecks: [
   *   {
   *     name: 'stripe',
   *     async check() {
   *       await fetch('https://api.stripe.com/v1/balance', { ... })
   *       return { status: 'ok' }
   *     },
   *   },
   * ]
   * ```
   */
  deepHealthChecks?: import('./health.js').HealthCheck[]
  /** Path for the root status endpoint. Default `/`. */
  rootPath?: string
  /** Logger override. Default is silent (no-op). */
  logger?: ServerLogger
  /**
   * Toggle Helmet security headers (HSTS, X-Frame-Options, X-Content-Type-Options,
   * Referrer-Policy, ...). Default `true`. Set to `false` only when the
   * caller mounts its own helmet config — most consumers should leave it on.
   */
  security?: boolean
  /**
   * Number of proxy hops to trust when resolving `req.ip` from
   * `X-Forwarded-For`. Passed straight to Express `app.set('trust proxy', ...)`.
   *
   * Precedence (highest → lowest):
   * 1. `config.trustProxyHops` (this field)
   * 2. `process.env.TRUST_PROXY_HOPS` (numeric or literal `'true'`)
   * 3. Default `2` — matches the current Railway edge → Fastly CDN topology
   *
   * Set `true` to trust ALL hops (dangerous — only for tests behind a known
   * LB). Set `0` to disable proxy trust entirely (`req.ip` becomes the direct
   * socket address). When the env var fails to parse as a finite non-negative
   * number, the core logs an error and falls back to `2`.
   *
   * @example
   * ```ts
   * createBaseApiServer({ port: 3000, trustProxyHops: 3 }) // Cloudflare + Fastly + Railway
   * ```
   */
  trustProxyHops?: number | boolean
  /**
   * Suppresses the production-mode warning emitted when Helmet's
   * `Content-Security-Policy` is disabled (the api-core default — Next.js
   * consumers ship their own CSP via `vercel.json` or middleware).
   *
   * Set to `true` ONLY when the caller is intentionally running without a
   * CSP (e.g. an internal-only API behind a strict allowlist). Leaving the
   * warning enabled is the safer default — it surfaces an operator footgun
   * when a new service forgets to layer a CSP on top.
   *
   * Skipped automatically when `NODE_ENV !== 'production'` to keep vitest /
   * dev output quiet.
   */
  disableCspWarning?: boolean
}

/**
 * Public surface of a server built with `createBaseApiServer`.
 */
export type ApiServer = {
  /** The underlying Express app — escape hatch when advanced wiring is needed. */
  app: import('express').Express
  /** Resolved configuration (read-only). */
  readonly config: Readonly<Required<Pick<ServerConfig, 'port' | 'serviceName'>> & ServerConfig>
  /** Bound logger (silent no-op if none was provided). */
  readonly logger: ServerLogger
}
