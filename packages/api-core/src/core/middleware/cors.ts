/**
 * CORS middleware factories.
 *
 * Three factories implementing the @ezstart 3-tier CORS policy:
 *
 * - `createPermissiveCorsMiddleware` — **Tier 1 + 2** (public + Bearer).
 *   Reflects the request `Origin` back in `Access-Control-Allow-Origin`
 *   and sets `credentials: true` so SDK fetches using
 *   `credentials: 'include'` are spec-compatible. Safe because Tier 1/2
 *   endpoints authenticate via publishable key (`ez_pk_*`) or Bearer
 *   token — never via cookies, even when one is sent.
 *
 * - `createStrictCorsMiddleware` — **Tier 3** (cookie-authenticated).
 *   Reflects the request origin only when it matches a string/regex
 *   allowlist and sets `credentials: true`. Strict allowlist is mandatory
 *   here because cookies are auto-sent by the browser on every request,
 *   so CSRF protection requires origin whitelisting.
 *
 * - `createCorsMiddleware` — **legacy** wrapper kept for backwards
 *   compatibility with the original `CorsConfig` shape. New code should
 *   pick permissive or strict explicitly.
 *
 * See `.claude/rules/standard-saas-cors.md` for the full rationale and the
 * per-tier endpoint classification.
 */

import cors, { type CorsOptions } from 'cors'
import type { RequestHandler } from 'express'
import type { CorsConfig, ServerLogger } from '../types.js'

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

/**
 * Default headers accepted on every Tier 1/2 endpoint.
 *
 * `Authorization`, `X-API-Key` cover the two stateless auth modes (Bearer
 * JWT and publishable key). `X-EZStart-Signature` is emitted by the
 * `@ezstart/pay-sdk` connect callback to prove origin provenance, and
 * `X-User-Id` is the legacy dev-only header still used in a few admin
 * paths during the migration window.
 */
const PERMISSIVE_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-API-Key',
  'X-EZStart-Signature',
  'X-User-Id',
]

/**
 * Headers exposed to the consumer JS (i.e. readable from `fetch().headers`).
 * `X-Request-Id` is emitted by `@ezstart/api-core` for every response and
 * `Retry-After` is used by the rate limiters (429) and some idempotency
 * flows.
 */
const PERMISSIVE_EXPOSED_HEADERS = ['X-Request-Id', 'Retry-After']

/**
 * Strict-mode default headers. Narrower than permissive: no `X-API-Key`
 * (cookie-auth routes never accept a publishable key) and no dev header.
 */
const STRICT_ALLOWED_HEADERS = ['Content-Type', 'Authorization']

export type PermissiveCorsOptions = {
  /** Override the default methods (`GET/POST/PUT/DELETE/PATCH/OPTIONS`). */
  methods?: string[]
  /** Override the default `Access-Control-Allow-Headers` list. */
  allowedHeaders?: string[]
  /** Override the default `Access-Control-Expose-Headers` list. */
  exposedHeaders?: string[]
}

export type StrictCorsEntry = string | RegExp

export type StrictCorsOptions = {
  /** First-party origins allowed to send credentialed requests. */
  allowlist: readonly StrictCorsEntry[]
  /** Override the default methods. */
  methods?: string[]
  /** Override the default allowed headers (narrower than permissive). */
  allowedHeaders?: string[]
  /** Optional logger — used to warn when a request is rejected. */
  logger?: ServerLogger
}

/**
 * Tier 1 + Tier 2 CORS middleware (public + Bearer endpoints).
 *
 * Reflects the request `Origin` header and sets `credentials: true` so SDK
 * fetches that use `credentials: 'include'` (a common default for clients
 * like `@ezstart/auth-sdk`) can complete. Reflecting the origin is safe
 * here because Tier 1/2 endpoints are designed to be origin-agnostic —
 * they authenticate via publishable key (query param) or Bearer token
 * (explicit header) and **never** via cookies. Even if the browser sends
 * a session cookie with the request, the endpoints ignore it.
 *
 * A wildcard `Access-Control-Allow-Origin: *` would be slightly stricter
 * but incompatible with `credentials: 'include'` per the CORS spec
 * ([fetch spec §3.2.4](https://fetch.spec.whatwg.org/#cors-protocol)).
 * Origin reflection gives the same "any external consumer can call" UX
 * without breaking credentialed fetches.
 *
 * Safe to apply globally to every API — downstream strict middlewares
 * registered on cookie-auth prefixes will override the headers for those
 * specific paths.
 *
 * @example
 * ```ts
 * app.use(createPermissiveCorsMiddleware())
 * // → reflects `Origin`, `Access-Control-Allow-Credentials: true`
 * ```
 */
export function createPermissiveCorsMiddleware(
  options: PermissiveCorsOptions = {}
): RequestHandler {
  const opts: CorsOptions = {
    // Reflect any origin. `true` tells the `cors` package to echo the
    // request `Origin` header back in `Access-Control-Allow-Origin`. That
    // keeps the "allow every external consumer" semantics while staying
    // compatible with `credentials: 'include'` on the client side.
    origin: true,
    credentials: true,
    methods: options.methods ?? DEFAULT_METHODS,
    allowedHeaders: options.allowedHeaders ?? PERMISSIVE_ALLOWED_HEADERS,
    exposedHeaders: options.exposedHeaders ?? PERMISSIVE_EXPOSED_HEADERS,
  }
  return cors(opts)
}

function matchesAllowlist(origin: string, allowlist: readonly StrictCorsEntry[]): boolean {
  for (const entry of allowlist) {
    if (typeof entry === 'string') {
      if (entry === origin) return true
    } else if (entry.test(origin)) {
      return true
    }
  }
  return false
}

/**
 * Tier 3 CORS middleware — cookie-authenticated routes only.
 *
 * Reflects the request `Origin` header back in `Access-Control-Allow-Origin`
 * only when it matches the provided allowlist (exact string or regex).
 * Sets `credentials: true` so httpOnly cookies flow cross-origin.
 *
 * Requests without an `Origin` header (same-origin fetch, server-to-server,
 * curl, Postman) are always allowed — CORS is a browser-side protection
 * mechanism so bypassing it from tooling is expected.
 *
 * @example
 * ```ts
 * app.use('/api/auth/login', createStrictCorsMiddleware({
 *   allowlist: [
 *     'https://ezauth.ezstart.xyz',
 *     /^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/,
 *     'http://localhost:6111',
 *   ],
 * }))
 * ```
 */
export function createStrictCorsMiddleware(options: StrictCorsOptions): RequestHandler {
  const { allowlist, methods, allowedHeaders, logger } = options

  const opts: CorsOptions = {
    origin(origin, callback) {
      if (!origin) {
        // Same-origin / curl / Postman / server-to-server — no browser CSRF
        // vector, CORS does not apply. Let the request through without
        // reflecting any `Access-Control-Allow-Origin` header.
        return callback(null, true)
      }
      const allowed = matchesAllowlist(origin, allowlist)
      if (!allowed && logger) {
        logger.warn('[cors] Blocked cross-origin request', { origin })
      }
      // Pass `null` (no error) with `false` so the `cors` package simply
      // omits the `Access-Control-Allow-Origin` header — the browser then
      // blocks the request naturally without reaching our default error
      // handler. Passing an `Error` would propagate through Express and
      // leak a 500 HTML stack trace to the caller.
      callback(null, allowed)
    },
    credentials: true,
    methods: methods ?? DEFAULT_METHODS,
    allowedHeaders: allowedHeaders ?? STRICT_ALLOWED_HEADERS,
    exposedHeaders: PERMISSIVE_EXPOSED_HEADERS,
  }
  return cors(opts)
}

/**
 * Legacy factory — kept for backwards compatibility. New code should use
 * `createPermissiveCorsMiddleware` (Tier 1/2) or `createStrictCorsMiddleware`
 * (Tier 3) directly.
 *
 * @deprecated Use `createPermissiveCorsMiddleware` or
 * `createStrictCorsMiddleware` based on the endpoint auth mode. See
 * `.claude/rules/standard-saas-cors.md`.
 *
 * @example
 * ```ts
 * // Legacy open policy (dev only)
 * app.use(createCorsMiddleware('*'))
 *
 * // Legacy strict with credentials
 * app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
 * ```
 */
export function createCorsMiddleware(config: CorsConfig): RequestHandler {
  if (config === '*') {
    const opts: CorsOptions = {
      origin: '*',
      credentials: false,
      methods: DEFAULT_METHODS,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-api-key'],
    }
    return cors(opts)
  }

  const opts: CorsOptions = {
    origin: config.origins,
    credentials: config.credentials ?? true,
    methods: config.methods ?? DEFAULT_METHODS,
    allowedHeaders: config.allowedHeaders ?? [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'x-api-key',
    ],
  }
  return cors(opts)
}
