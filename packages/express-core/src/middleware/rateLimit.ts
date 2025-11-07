/**
 * Rate Limiting Middleware
 *
 * Centralized rate limiting configuration for all APIs.
 * Uses express-rate-limit to protect against abuse and DDoS attacks.
 *
 * @packageDocumentation
 */

import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /**
   * Window duration in minutes
   * @default 15
   */
  windowMs?: number

  /**
   * Maximum requests per window
   * @default 100
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
}

/**
 * Standard rate limiter (100 req/15min per IP)
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
    max = isDev ? 1000 : 100, // More permissive in dev (1000 vs 100)
    message = 'Too many requests from this IP, please try again later.',
    skipPaths = ['/api/health']
  } = options

  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000) // seconds
      }
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Trust proxy is enabled in createApp() for Railway/Vercel deployment
    // We trust X-Forwarded-For header from our reverse proxies
    validate: { trustProxy: false },
    skip: (req) => {
      // Skip rate limiting for health checks
      return skipPaths.some(path => req.path === path)
    },
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: res.getHeader('Retry-After')
        }
      })
    }
  })
}

/**
 * Strict rate limiter for sensitive endpoints (5 req/min per IP)
 *
 * Use for authentication endpoints like login, register, password reset
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
    message = 'Too many attempts from this IP, please try again later.',
  } = options

  return createRateLimiter({
    windowMs,
    max,
    message,
    skipPaths: [] // Don't skip any paths for strict limiter
  })
}

/**
 * Very strict rate limiter for highly sensitive endpoints (3 req/hour per IP)
 *
 * Use for account creation, password reset requests, etc.
 *
 * @example
 * ```typescript
 * import { createVeryStrictRateLimiter } from '@ezstart/express-core'
 *
 * app.post('/api/auth/register', createVeryStrictRateLimiter(), registerHandler)
 * ```
 */
export function createVeryStrictRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    max = 3, // 3 requests per hour
    message = 'Too many registration attempts from this IP, please try again later.',
  } = options

  return createRateLimiter({
    windowMs,
    max,
    message,
    skipPaths: [] // Don't skip any paths for very strict limiter
  })
}

/**
 * Moderate rate limiter for donation/payment endpoints (10 req/hour per IP)
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
    message = 'Too many payment attempts from this IP, please try again later.',
  } = options

  return createRateLimiter({
    windowMs,
    max,
    message,
    skipPaths: []
  })
}
