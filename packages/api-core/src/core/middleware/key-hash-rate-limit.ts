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
 * ### Memory bounds (H3 fix — 2026-05-16)
 *
 * Each unique key occupies one Map entry until its window expires. Without an
 * upper bound, an attacker who sends N requests with N distinct keys (e.g.
 * `?key=ez_pk_test_<random hex>`) grows the Map to N entries that linger for
 * `windowMs` seconds, enabling a cheap memory-pressure DoS. The factory now
 * accepts `maxEntries` (default `10_000`) and evicts the least-recently-used
 * entry once the cap is reached. LRU ordering is maintained by re-inserting on
 * `get` access, mirroring the in-memory idempotency store pattern in
 * `idempotency.ts`.
 *
 * ### Test bypass (H4 fix — 2026-05-16)
 *
 * The limiter does NOT auto-disable when `NODE_ENV === 'test'`. A misconfigured
 * production deploy with `NODE_ENV=test` would have silently unmetered every
 * endpoint that uses this factory. Callers that need to skip the limiter
 * (typically test suites whose supertest fixtures all share the loopback IP)
 * must opt out explicitly via the new `disabled: true` option. There is no
 * env-var escape hatch — disabling is always intentional and visible at the
 * call site.
 *
 * @example
 * ```ts
 * import { createKeyHashRateLimiter } from '@ezstart/api-core'
 *
 * const limitByKey = createKeyHashRateLimiter({
 *   extractKey: req => hashApiKey(String(req.query.key ?? '')),
 *   maxEntries: 5_000,     // cap memory growth under enumeration attacks
 *   disabled: process.env.SKIP_RATE_LIMIT === '1', // explicit opt-out, never NODE_ENV
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
   * Maximum number of distinct keys tracked concurrently. Once the Map grows
   * past this cap, the least-recently-used entry is evicted before the new
   * entry is inserted — bounded memory regardless of input cardinality.
   * Defaults to `10_000`.
   *
   * Rationale: without a bound, an attacker can spray N distinct keys to grow
   * the in-memory Map to N entries (~50 bytes each), lingering for `windowMs`
   * seconds before natural expiry. A million unique keys = ~50 MB heap held
   * for the window duration — repeated waves OOM the process. The default cap
   * keeps worst-case memory usage well below 1 MB while comfortably covering
   * legitimate multi-tenant traffic for any one limiter instance.
   */
  maxEntries?: number
  /**
   * When `true`, every request bypasses the limiter and calls `next()`
   * immediately. Intended for test suites that share a single source IP /
   * key across many specs and would otherwise self-throttle.
   *
   * **Defaults to `false`** — there is no implicit `NODE_ENV=test` bypass.
   * Disabling must be opt-in and visible at the call site so a misconfigured
   * production deploy can never silently unmeter the endpoint.
   */
  disabled?: boolean
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
const DEFAULT_MAX_ENTRIES = 10_000
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
 *
 * Memory is bounded by `maxEntries` (default `10_000`) with LRU eviction —
 * see the module JSDoc for the rationale behind the H3 hardening.
 */
export function createKeyHashRateLimiter(opts: KeyHashRateLimiterOptions): KeyHashRateLimiter {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const max = opts.max ?? DEFAULT_MAX
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES
  const disabled = opts.disabled === true
  const errorCode = opts.errorCode ?? DEFAULT_ERROR_CODE
  const errorMessage = opts.errorMessage ?? DEFAULT_ERROR_MESSAGE

  // Map preserves insertion order — re-inserting on access gives us LRU.
  const map = new Map<string, RateLimitEntry>()

  /**
   * LRU-aware getter: re-inserts the entry on each access so frequently-used
   * keys drift toward the tail and survive eviction.
   */
  function touch(key: string): RateLimitEntry | undefined {
    const entry = map.get(key)
    if (!entry) return undefined
    map.delete(key)
    map.set(key, entry)
    return entry
  }

  /**
   * Insert or replace an entry. Evicts the least-recently-used entry first
   * when the Map would otherwise grow past `maxEntries`.
   */
  function set(key: string, entry: RateLimitEntry): void {
    if (map.has(key)) {
      map.delete(key)
    } else if (map.size >= maxEntries) {
      // Evict oldest (first inserted = least recently touched).
      const oldestKey = map.keys().next().value
      if (oldestKey !== undefined) map.delete(oldestKey)
    }
    map.set(key, entry)
  }

  const middleware: RequestHandler = (req, res, next) => {
    if (disabled) {
      next()
      return
    }

    const key = opts.extractKey(req)
    if (key == null || key === '') {
      next()
      return
    }

    const now = Date.now()
    const entry = touch(key)

    if (!entry || entry.resetAt < now) {
      set(key, { count: 1, resetAt: now + windowMs })
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
