/**
 * Per-key in-memory rate limiter — small Map-backed sliding-window counter
 * keyed by an arbitrary string (typically a hashed publishable API key or a
 * tenant slug). Designed for the public, key-authenticated endpoints whose
 * caller identity is the API key itself rather than the source IP, so the
 * IP-based `createRateLimiter` (express-rate-limit) is the wrong tool.
 *
 * Distinguishes itself from {@link createRateLimiter} on three axes:
 *
 * 1. **Keyed by a request-derived value** (not the IP) — multi-tenant friendly.
 * 2. **No external dependency** (no `express-rate-limit`) — minimal surface,
 *    O(1) Map ops, suitable for endpoints that are themselves cheap.
 * 3. **Test-friendly** — exposes a `.reset()` method on the returned handler
 *    so suites that exercise the 429 path can clear counters between specs.
 *
 * The state lives in a closure scoped to each `createKeyHashRateLimiter()`
 * call — call once at module load, reuse the returned handler across all
 * routes that should share the limit window.
 *
 * @example
 * ```ts
 * import { createKeyHashRateLimiter } from '@ezstart/api-core'
 *
 * const limitByKey = createKeyHashRateLimiter({
 *   extractKey: req => hashApiKey(String(req.query.key ?? '')),
 * })
 *
 * router.get('/keys/config', limitByKey, configController)
 *
 * // In tests:
 * beforeEach(() => limitByKey.reset())
 * ```
 *
 * @module @ezstart/api-core/core/middleware/key-hash-rate-limit
 */

import type { Request, RequestHandler } from 'express'
import { sendError } from '../responses.js'

/**
 * Configuration for {@link createKeyHashRateLimiter}.
 */
export interface KeyHashRateLimiterOptions {
  /**
   * Extract a stable identifier for the caller from the request. Return
   * `null` or `undefined` to bypass the limiter entirely for that request
   * (typical when the caller-supplied parameter is missing — let the
   * downstream handler emit its own 400).
   */
  extractKey: (req: Request) => string | null | undefined
  /** Window duration in milliseconds. Defaults to `60_000` (60 s). */
  windowMs?: number
  /** Max requests per window per key. Defaults to `30`. */
  max?: number
  /**
   * Machine-readable error code emitted in the 429 envelope. Defaults to
   * `'RATE_LIMIT_EXCEEDED'`.
   */
  errorCode?: string
  /**
   * Human-facing error message emitted in the 429 envelope. Defaults to
   * `'Too many requests, please try again later.'`.
   */
  errorMessage?: string
}

/**
 * The Express handler returned by {@link createKeyHashRateLimiter}, with an
 * extra `.reset()` method exposed for test suites.
 */
export interface KeyHashRateLimiter extends RequestHandler {
  /**
   * Clear the in-memory window — intended for tests that exercise the 429
   * threshold and need a clean counter between specs. No-op in production
   * code paths beyond test setup.
   */
  reset(): void
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX = 30
const DEFAULT_ERROR_CODE = 'RATE_LIMIT_EXCEEDED'
const DEFAULT_ERROR_MESSAGE = 'Too many requests, please try again later.'

/**
 * Build a per-key in-memory rate limiter. The returned middleware checks
 * `extractKey(req)`; if the result is a string, the call is counted against
 * a sliding window and a 429 envelope is emitted once `max` is exceeded.
 * Null/undefined keys bypass the limiter and call `next()` immediately.
 *
 * The retry hint emitted in the 429 envelope (`error.retryAfter`) is the
 * remaining seconds until the current window resets, so clients can honor
 * it directly without re-deriving the window length.
 */
export function createKeyHashRateLimiter(opts: KeyHashRateLimiterOptions): KeyHashRateLimiter {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const max = opts.max ?? DEFAULT_MAX
  const errorCode = opts.errorCode ?? DEFAULT_ERROR_CODE
  const errorMessage = opts.errorMessage ?? DEFAULT_ERROR_MESSAGE

  const map = new Map<string, RateLimitEntry>()

  const middleware: RequestHandler = (req, res, next) => {
    const key = opts.extractKey(req)
    if (key == null || key === '') {
      next()
      return
    }

    const now = Date.now()
    const entry = map.get(key)

    if (!entry || entry.resetAt < now) {
      map.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    entry.count += 1
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      sendError(res, errorMessage, 429, { code: errorCode, retryAfter })
      return
    }

    next()
  }

  const limiter = middleware as KeyHashRateLimiter
  limiter.reset = () => {
    map.clear()
  }
  return limiter
}
