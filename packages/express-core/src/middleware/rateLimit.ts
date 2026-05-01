/**
 * Rate Limiting Middleware
 *
 * Centralized rate limiting configuration for all APIs.
 * Uses express-rate-limit to protect against abuse and DDoS attacks.
 *
 * Default `keyGenerator` buckets requests by auth identity:
 *   1. Authenticated user (`req.userId` or `req.user._id`) → personal bucket
 *   2. API key auth (`req.apiKeyId`) → per-key bucket (base for usage-based billing)
 *   3. Anonymous → `req.ip` fallback (anti-abuse for public routes)
 *
 * Per-IP bucketing alone is broken behind a CDN/LB: every authenticated user
 * sharing the same egress IP would share a single quota and self-DOS.
 *
 * @packageDocumentation
 */

import type { Request } from 'express'
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /**
   * Window duration in milliseconds
   * @default 15 * 60 * 1000 (15 minutes)
   */
  windowMs?: number

  /**
   * Maximum requests per window per bucket (see keyGenerator)
   * @default 500 in prod, 1000 in dev
   */
  max?: number

  /**
   * Custom message for rate limit exceeded
   */
  message?: string

  /**
   * Skip rate limiting for specific paths (e.g., /api/health)
   * @default ['/api/health']
   */
  skipPaths?: string[]

  /**
   * Custom key generator. Defaults to per-user / per-API-key / per-IP smart bucketing.
   * Override only if you know what you're doing — IP-only bucketing is broken
   * behind a CDN/LB.
   */
  keyGenerator?: (req: Request) => string
}

/**
 * Default key generator — buckets by auth identity, falls back to IP.
 *
 * Priority:
 *   1. `req.userId` or `req.user._id` (authenticated via JWT cookie or Bearer)
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
 * Standard rate limiter (500 req/15min per user, 1000 in dev)
 *
 * Buckets requests per authenticated user (or per API key, or per IP for
 * anonymous traffic) — see {@link defaultKeyGenerator}.
 *
 * @example
 * ```typescript
 * import { createRateLimiter } from '@ezstart/express-core'
 *
 * app.use(createRateLimiter())
 * ```
 */
export function createRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  const isDev = process.env.NODE_ENV === 'development'

  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = isDev ? 1000 : 500, // Per-bucket limit (per-user, per-key, or per-IP for anon)
    message = 'Too many requests, please try again later.',
    skipPaths = ['/api/health'],
    keyGenerator = defaultKeyGenerator,
  } = options

  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000), // seconds
      },
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator,
    // express-rate-limit's built-in trustProxy validation runs by default and
    // warns loudly if our `app.set('trust proxy', ...)` config is wrong.
    // (Was previously silenced via `validate: { trustProxy: false }` to mask
    // the over-permissive `trust proxy: true` setting — now fixed in createApp.)
    skip: req => {
      // Skip rate limiting for health checks
      return skipPaths.some(path => req.path === path)
    },
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: res.getHeader('Retry-After'),
        },
      })
    },
  })
}

/**
 * Strict rate limiter for sensitive endpoints (5 req/min per bucket)
 *
 * Use for authentication endpoints like login, register, password reset.
 * Inherits per-user / per-API-key / per-IP bucketing from {@link createRateLimiter}.
 *
 * @example
 * ```typescript
 * import { createStrictRateLimiter } from '@ezstart/express-core'
 *
 * app.post('/api/auth/login', createStrictRateLimiter(), loginHandler)
 * ```
 */
export function createStrictRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  const {
    windowMs = 1 * 60 * 1000, // 1 minute
    max = 5, // 5 requests per minute
    message = 'Too many attempts, please try again later.',
  } = options

  return createRateLimiter({
    windowMs,
    max,
    message,
    skipPaths: [], // Don't skip any paths for strict limiter
  })
}

/**
 * Very strict rate limiter for highly sensitive endpoints (3 req/hour per bucket)
 *
 * Use for account creation, password reset requests, etc.
 * Inherits per-user / per-API-key / per-IP bucketing from {@link createRateLimiter}.
 *
 * @example
 * ```typescript
 * import { createVeryStrictRateLimiter } from '@ezstart/express-core'
 *
 * app.post('/api/auth/register', createVeryStrictRateLimiter(), registerHandler)
 * ```
 */
export function createVeryStrictRateLimiter(
  options: RateLimitOptions = {}
): RateLimitRequestHandler {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    max = 3, // 3 requests per hour
    message = 'Too many registration attempts, please try again later.',
  } = options

  return createRateLimiter({
    windowMs,
    max,
    message,
    skipPaths: [], // Don't skip any paths for very strict limiter
  })
}

/**
 * Moderate rate limiter for donation/payment endpoints (10 req/hour per bucket)
 *
 * Inherits per-user / per-API-key / per-IP bucketing from {@link createRateLimiter}.
 *
 * @example
 * ```typescript
 * import { createModerateRateLimiter } from '@ezstart/express-core'
 *
 * app.post('/api/donate', createModerateRateLimiter(), donateHandler)
 * ```
 */
export function createModerateRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    max = 10, // 10 requests per hour
    message = 'Too many payment attempts, please try again later.',
  } = options

  return createRateLimiter({
    windowMs,
    max,
    message,
    skipPaths: [],
  })
}
