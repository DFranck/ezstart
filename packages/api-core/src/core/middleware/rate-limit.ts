/**
 * Rate limiting middleware factory — wraps `express-rate-limit` with a
 * consistent error envelope and four presets aligned with common use cases.
 */

import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  /** Window duration in milliseconds. */
  windowMs?: number
  /** Maximum requests per window per client. */
  max?: number
  /** Custom user-facing message. */
  message?: string
  /** Paths that bypass the limiter (default: `['/api/health']`). */
  skipPaths?: string[]
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
 * Build a rate-limit middleware — default `100 req / 15 min` (more
 * permissive in development: `1000 req / 15 min`).
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
    max = isDev ? 1000 : 100,
    message = 'Too many requests from this IP, please try again later.',
    skipPaths = ['/api/health'],
  } = options

  const retryAfterSeconds = Math.ceil(windowMs / 1000)

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Trust proxy is enabled at the app level (Railway / Vercel).
    // The limiter itself does NOT re-validate — keeps X-Forwarded-For usable.
    validate: { trustProxy: false },
    skip: req => skipPaths.some(path => req.path === path),
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
 * Strict limiter — `5 req / 1 min`. For authentication endpoints.
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
    message: 'Too many attempts from this IP, please try again later.',
    skipPaths: [],
    ...options,
  })
}

/**
 * Very-strict limiter — `3 req / 1 hour`. For registration / password reset.
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
    message: 'Too many registration attempts from this IP, please try again later.',
    skipPaths: [],
    ...options,
  })
}

/**
 * Moderate limiter — `10 req / 1 hour`. For payment/donation endpoints.
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
    message: 'Too many payment attempts from this IP, please try again later.',
    skipPaths: [],
    ...options,
  })
}
