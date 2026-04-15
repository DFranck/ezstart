/**
 * Core agnostic types for the API server framework.
 *
 * No coupling to `@ezstart/config`, `@ezstart/logger`, `mongoose`, `socket.io`
 * or any monorepo-specific concept. Consumers configure the server via
 * `createApiServer(config)`.
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
 * Applications are free to extend via the `extra` open bucket — the core
 * only relies on `userId` to populate `req.userId`.
 */
export type AuthenticatedUser = {
  userId: string
  email?: string
  username?: string
  roles?: string[]
  permissions?: string[]
  /** Extra app-specific fields (appRoles, features, etc.). */
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
 * CORS configuration. When `corsOrigins` is `'*'` every origin is accepted
 * (discouraged in production). Array form restricts to the listed origins
 * with `credentials: true`.
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
 * Rate-limiter preset. The core ships four presets (standard / strict /
 * very-strict / moderate) and accepts fully custom overrides.
 */
export type RateLimitPreset = 'standard' | 'strict' | 'very-strict' | 'moderate'

/**
 * Configuration accepted by `createApiServer`.
 */
export type ServerConfig = {
  /** Port to bind when `startServer()` is invoked. Required. */
  port: number
  /** Human-readable name used in logs / OpenAPI title. */
  serviceName?: string
  /** CORS policy. Default `'*'`. */
  cors?: CorsConfig
  /**
   * When set, `createApiServer` returns an app with `createRateLimiter()`
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
  db?: import('./internal/db-connector.js').DbConnector
  /** Raw body routes (webhooks). Registered BEFORE the JSON parser. */
  rawBodyRoutes?: string[]
  /** Path for the health endpoint. Default `/api/health`. */
  healthPath?: string
  /** Path for the root status endpoint. Default `/`. */
  rootPath?: string
  /** Logger override. Default is silent (no-op). */
  logger?: ServerLogger
}

/**
 * Public surface of a server built with `createApiServer`.
 */
export type ApiServer = {
  /** The underlying Express app — escape hatch when advanced wiring is needed. */
  app: import('express').Express
  /** Resolved configuration (read-only). */
  readonly config: Readonly<Required<Pick<ServerConfig, 'port' | 'serviceName'>> & ServerConfig>
  /** Bound logger (silent no-op if none was provided). */
  readonly logger: ServerLogger
}
