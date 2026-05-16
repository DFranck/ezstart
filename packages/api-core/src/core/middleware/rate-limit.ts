/**
 * Rate limiting middleware factory — wraps `express-rate-limit` with a
 * consistent error envelope and four presets aligned with common use cases.
 *
 * Default `keyGenerator` buckets requests by auth identity:
 *   1. Authenticated user (`req.userId` or `req.user._id` / `req.user.userId`) → personal bucket
 *   2. API key auth (`req.apiKeyId`) → per-key bucket (base for usage-based billing)
 *   3. Anonymous → `req.ip` fallback (anti-abuse for public routes)
 *
 * Per-IP bucketing alone is broken behind a CDN/LB: every authenticated user
 * sharing the same egress IP would share a single quota and self-DOS.
 *
 * ### Test bypass (H4 fix — 2026-05-16)
 *
 * The limiter does NOT auto-disable when `NODE_ENV === 'test'`. A misconfigured
 * production deploy with `NODE_ENV=test` would have silently unmetered every
 * limiter — brute-force protection, account lockout, billing abuse: all wide
 * open with no boot signal. Callers that need to skip the limiter (typically
 * test suites whose supertest fixtures all share the loopback IP) must opt
 * out explicitly via the new `disabled: true` option. There is no env-var
 * escape hatch — disabling is always intentional and visible at the call
 * site.
 */

import type { Request } from 'express'
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  /** Window duration in milliseconds. */
  windowMs?: number
  /**
   * Maximum requests per window per bucket (see {@link defaultKeyGenerator}).
   * @default 2000 in prod, 5000 in dev — V1 pro-ready scaling, ~133 req/min
   * average per authenticated user (Clerk-niveau headroom).
   */
  max?: number
  /** Custom user-facing message. */
  message?: string
  /** Paths that bypass the limiter (default: `['/health', '/api/health']`). */
  skipPaths?: string[]
  /**
   * Custom key generator. Defaults to per-user / per-API-key / per-IP smart
   * bucketing — see {@link defaultKeyGenerator}. Override only if you know
   * what you're doing — IP-only bucketing is broken behind a CDN/LB.
   */
  keyGenerator?: (req: Request) => string
  /**
   * When `true`, every request bypasses the limiter and calls `next()`
   * immediately. Intended for test suites that share a single source IP
   * across many specs and would otherwise self-throttle.
   *
   * **Defaults to `false`** — there is no implicit `NODE_ENV=test` bypass
   * (H4 fix, 2026-05-16). A misconfigured production deploy with
   * `NODE_ENV=test` previously silently unmetered every limiter. Disabling
   * must now be opt-in and visible at the call site.
   *
   * @example
   * ```ts
   * // Test suite — opt out explicitly so the shared loopback IP doesn't
   * // throttle other tests sharing this Express instance.
   * app.use(createRateLimiter({ disabled: process.env.NODE_ENV === 'test' }))
   * ```
   */
  disabled?: boolean
}

type RateLimitHandlerBody = {
  success: false
  error: {
    message: string
    code: 'RATE_LIMIT_EXCEEDED'
    retryAfter: number
  }
}

/**
 * Default key generator — buckets by auth identity, falls back to IP.
 *
 * Priority:
 *   1. `req.userId` or `req.user._id` / `req.user.userId` (authenticated via JWT cookie or Bearer)
 *   2. `req.apiKeyId` (authenticated via API key)
 *   3. `req.ip` (anonymous — anti-abuse for public routes)
 *
 * @internal
 */
function defaultKeyGenerator(req: Request): string {
  const userIdFromReq = typeof req.userId === 'string' ? req.userId : undefined
  const userIdFromUser =
    typeof (req.user as { _id?: unknown } | undefined)?._id === 'string'
      ? (req.user as { _id: string })._id
      : typeof (req.user as { userId?: unknown } | undefined)?.userId === 'string'
        ? (req.user as { userId: string }).userId
        : undefined
  const userId = userIdFromReq ?? userIdFromUser
  if (typeof userId === 'string' && userId.length > 0) {
    return `user:${userId}`
  }

  const apiKeyId = (req as Request & { apiKeyId?: unknown }).apiKeyId
  if (typeof apiKeyId === 'string' && apiKeyId.length > 0) {
    return `apikey:${apiKeyId}`
  }

  return req.ip ?? 'unknown'
}

/**
 * Build a rate-limit middleware — default `2000 req / 15 min` per bucket
 * (more permissive in development: `5000 req / 15 min`).
 *
 * Buckets requests per authenticated user (or per API key, or per IP for
 * anonymous traffic) — see {@link defaultKeyGenerator}.
 *
 * Caps tuned for Clerk-niveau scaling: ~133 req/min average per authenticated
 * user covers active power users, admins, and testers without disturbing real
 * usage (long sessions, multi-tab, dashboard polling). When usage-based billing
 * tiers go live (V2), bump per-tier (e.g., Free 500/15min, Pro 5000/15min,
 * Enterprise unlimited).
 *
 * @example
 * ```ts
 * import { createRateLimiter } from '@ezstart/api-core'
 *
 * app.use(createRateLimiter())
 * ```
 */
export function createRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  const isDev = process.env.NODE_ENV === 'development'

  const {
    windowMs = 15 * 60 * 1000,
    max = isDev ? 5000 : 2000,
    message = 'Too many requests, please try again later.',
    skipPaths = ['/health', '/api/health'],
    keyGenerator = defaultKeyGenerator,
    disabled = false,
  } = options

  const retryAfterSeconds = Math.ceil(windowMs / 1000)

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    // express-rate-limit's built-in trustProxy validation runs by default and
    // warns loudly if our `app.set('trust proxy', ...)` config is wrong.
    // (Was previously silenced via `validate: { trustProxy: false }` to mask
    // the over-permissive `trust proxy: true` setting — now fixed in
    // `createBaseApiServer` to `2` matching real Fastly→Railway hop count.)
    //
    // H4 hardening (2026-05-16): the previous `NODE_ENV === 'test'` implicit
    // bypass was removed. A misconfigured production deploy with `NODE_ENV=test`
    // would have silently unmetered every limiter — auth lockout, brute-force
    // protection, billing abuse: all wide open with no boot signal. Callers
    // that need to disable the limiter (typically test suites whose supertest
    // fixtures all share the loopback IP) must opt in via `disabled: true`.
    skip: req => {
      if (disabled) return true
      return skipPaths.some(path => req.path === path)
    },
    handler: (_req, res) => {
      const headerRetry = res.getHeader('Retry-After')
      const parsed =
        typeof headerRetry === 'string' ? Number.parseInt(headerRetry, 10) : Number(headerRetry)
      const retryAfter = Number.isFinite(parsed) && parsed > 0 ? parsed : retryAfterSeconds
      const body: RateLimitHandlerBody = {
        success: false,
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
      }
      res.status(429).json(body)
    },
  })
}

/**
 * Strict limiter — `5 req / 1 min` per bucket. For authentication endpoints.
 *
 * Inherits per-user / per-API-key / per-IP bucketing from {@link createRateLimiter}.
 *
 * @example
 * ```ts
 * app.post('/api/auth/login', createStrictRateLimiter(), loginHandler)
 * ```
 */
export function createStrictRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  return createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many attempts, please try again later.',
    skipPaths: [],
    ...options,
  })
}

/**
 * Very-strict limiter — `3 req / 1 hour` per bucket. For registration / password reset.
 *
 * Inherits per-user / per-API-key / per-IP bucketing from {@link createRateLimiter}.
 *
 * @example
 * ```ts
 * app.post('/api/auth/register', createVeryStrictRateLimiter(), registerHandler)
 * ```
 */
export function createVeryStrictRateLimiter(
  options: RateLimitOptions = {}
): RateLimitRequestHandler {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many registration attempts, please try again later.',
    skipPaths: [],
    ...options,
  })
}

/**
 * Moderate limiter — `10 req / 1 hour` per bucket. For payment/donation endpoints.
 *
 * Inherits per-user / per-API-key / per-IP bucketing from {@link createRateLimiter}.
 *
 * @example
 * ```ts
 * app.post('/api/donate', createModerateRateLimiter(), donateHandler)
 * ```
 */
export function createModerateRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many payment attempts, please try again later.',
    skipPaths: [],
    ...options,
  })
}
