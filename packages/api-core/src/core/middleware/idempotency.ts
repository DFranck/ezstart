/**
 * Idempotency keys middleware — Stripe-pattern.
 *
 * Reads the `Idempotency-Key` request header on mutating methods (POST,
 * PUT, PATCH, DELETE). When the key is already known within the TTL
 * window, replays the cached response (status + headers + body) so the
 * caller observes exactly-once semantics even on retries / network
 * blips. New keys execute the handler chain, and the response is captured
 * via a `res.send` / `res.json` proxy and stored.
 *
 * Defensive notes (cf. `standard-saas-security.md` §6 + `standard-saas-data.md` §11):
 *
 * - Default store is an in-memory LRU (10k entries, 24h TTL) — fine for
 *   single-instance dev / staging / low-volume prod. Multi-replica prod
 *   MUST inject a Redis / Mongo store via the `store` option, otherwise
 *   each replica has its own cache and dedup is best-effort.
 * - The middleware never fails open silently: a store error during read
 *   surfaces as 500 with the canonical envelope so callers retry instead
 *   of receiving a stale response.
 * - Opt-in per route — DO NOT mount globally. Idempotency keys only make
 *   sense on writes that the caller explicitly tags.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { sendError } from '../responses.js'

/** Cached snapshot of a previously-served idempotent response. */
export type IdempotencyRecord = {
  /** HTTP status code returned the first time. */
  status: number
  /** Response body (parsed JSON when available, raw string otherwise). */
  body: unknown
  /** Subset of response headers worth replaying (Content-Type by default). */
  headers: Record<string, string>
  /** Wall-clock time the original response was produced. */
  storedAt: number
  /**
   * Hash of the request body — when present and re-submitted with a
   * different body, the middleware refuses with 422 (`KEY_REUSE_MISMATCH`)
   * to surface client bugs instead of silently replaying the wrong response.
   */
  requestHash?: string
}

/**
 * Storage contract for idempotent responses.
 *
 * Implementations should be safe to call concurrently. The middleware
 * never assumes atomicity between `get` and `set` — last-writer-wins is
 * acceptable: the worst case is two clients with the same key racing the
 * first request, which is a client-side bug the middleware does not try
 * to paper over.
 */
export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null> | IdempotencyRecord | null
  set(key: string, record: IdempotencyRecord): Promise<void> | void
  /** Optional cleanup hook — called by tests / shutdown. */
  clear?(): Promise<void> | void
}

/**
 * Configuration for {@link createIdempotencyMiddleware}.
 */
export type IdempotencyMiddlewareConfig = {
  /**
   * Persistent store. Defaults to {@link createInMemoryIdempotencyStore}
   * with a 10k-entry LRU and 24h TTL — fine for single-instance dev /
   * staging. Multi-replica production MUST inject Redis / Mongo.
   */
  store?: IdempotencyStore
  /**
   * Methods that require an `Idempotency-Key` to be honored. Default
   * `['POST', 'PUT', 'PATCH', 'DELETE']`. Other methods bypass the
   * middleware entirely (idempotent by HTTP semantics).
   */
  methods?: string[]
  /**
   * Header name to read. Default `'Idempotency-Key'` (Stripe-compatible).
   * Customizable for legacy clients.
   */
  headerName?: string
  /**
   * Hash of the request body, used to detect client bugs that reuse the
   * same key with a different body. When `undefined` (default) no hash
   * verification is performed and the cached response is replayed
   * verbatim regardless of the new body.
   */
  hashRequest?: (req: Request) => string | undefined
  /**
   * When `true`, missing key on a mutating request returns `400`
   * (Stripe-strict mode). Default `false` — missing key just bypasses
   * the middleware so legacy clients keep working.
   */
  required?: boolean
}

/**
 * Configuration for {@link createInMemoryIdempotencyStore}.
 */
export type InMemoryStoreConfig = {
  /** Max entries before LRU eviction. Default 10_000. */
  maxEntries?: number
  /** Per-entry TTL in milliseconds. Default `24 * 60 * 60 * 1000` (24h). */
  ttlMs?: number
}

/**
 * In-memory LRU store with TTL eviction.
 *
 * Single-process only — if you scale beyond one replica, swap this out
 * for a shared Redis or Mongo implementation. The LRU is implemented
 * with a `Map` (which preserves insertion order in V8) — every `get`
 * hit refreshes the entry by deleting + re-inserting it.
 *
 * @example
 * ```ts
 * const store = createInMemoryIdempotencyStore({ maxEntries: 50_000 })
 * app.post('/api/charges', createIdempotencyMiddleware({ store }), handler)
 * ```
 */
export function createInMemoryIdempotencyStore(config: InMemoryStoreConfig = {}): IdempotencyStore {
  const maxEntries = config.maxEntries ?? 10_000
  const ttlMs = config.ttlMs ?? 24 * 60 * 60 * 1000

  // Map preserves insertion order — re-inserting on access gives us LRU.
  const cache = new Map<string, IdempotencyRecord>()

  function isExpired(record: IdempotencyRecord): boolean {
    return Date.now() - record.storedAt > ttlMs
  }

  return {
    get(key) {
      const record = cache.get(key)
      if (!record) return null
      if (isExpired(record)) {
        cache.delete(key)
        return null
      }
      // LRU touch — re-insert to move to the tail.
      cache.delete(key)
      cache.set(key, record)
      return record
    },
    set(key, record) {
      if (cache.has(key)) cache.delete(key)
      cache.set(key, record)
      // Evict the least-recently-used entry while above capacity.
      while (cache.size > maxEntries) {
        const oldestKey = cache.keys().next().value
        if (oldestKey === undefined) break
        cache.delete(oldestKey)
      }
    },
    clear() {
      cache.clear()
    },
  }
}

const DEFAULT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
const DEFAULT_HEADER = 'Idempotency-Key'
const REPLAYED_HEADER = 'X-Idempotent-Replayed'

/**
 * Capture the response status + headers + body via a small proxy so the
 * middleware can persist them for subsequent replays. We only intercept
 * `res.json` / `res.send` because those are the canonical exit points used
 * across the @ezstart codebase (`sendSuccess` / `sendError` both end up in
 * `res.json`). Streaming responses are NOT cached — the middleware skips
 * them silently.
 *
 * @internal
 */
function instrumentResponse(
  res: Response,
  onCapture: (snapshot: { status: number; body: unknown; contentType: string | undefined }) => void
): void {
  let captured = false
  const originalJson = res.json.bind(res)
  const originalSend = res.send.bind(res)

  function capture(body: unknown): void {
    if (captured) return
    captured = true
    const contentType =
      (res.getHeader('Content-Type') as string | undefined) ?? 'application/json; charset=utf-8'
    try {
      onCapture({ status: res.statusCode, body, contentType })
    } catch {
      // Never let a capture/store failure poison the response — the body
      // has already been computed and is about to be flushed to the
      // caller. Observability hooks live inside the store implementation.
    }
  }

  res.json = function patchedJson(body: unknown) {
    capture(body)
    return originalJson(body)
  }
  res.send = function patchedSend(body: unknown) {
    capture(body)
    return originalSend(body)
  }
}

/**
 * Build the Express middleware that enforces Idempotency-Key semantics.
 *
 * Mount opt-in on every write endpoint that should be safe to retry:
 *
 * @example
 * ```ts
 * import { createIdempotencyMiddleware } from '@ezstart/api-core'
 *
 * const idempotency = createIdempotencyMiddleware()
 *
 * app.post('/api/charges', idempotency, async (req, res) => {
 *   const charge = await stripe.charges.create(req.body)
 *   sendSuccess(res, charge)
 * })
 * ```
 *
 * @example Pluggable Redis store
 * ```ts
 * const store: IdempotencyStore = {
 *   async get(key) { return JSON.parse(await redis.get(`idem:${key}`) ?? 'null') },
 *   async set(key, record) {
 *     await redis.set(`idem:${key}`, JSON.stringify(record), 'PX', 24 * 60 * 60 * 1000)
 *   },
 * }
 * app.post('/api/charges', createIdempotencyMiddleware({ store }), handler)
 * ```
 */
export function createIdempotencyMiddleware(
  config: IdempotencyMiddlewareConfig = {}
): RequestHandler {
  const store = config.store ?? createInMemoryIdempotencyStore()
  const methods = (config.methods ?? DEFAULT_METHODS).map(m => m.toUpperCase())
  const headerName = config.headerName ?? DEFAULT_HEADER
  const headerLower = headerName.toLowerCase()
  const required = config.required ?? false
  const hashRequest = config.hashRequest

  return async function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!methods.includes(req.method.toUpperCase())) {
      return next()
    }

    const rawKey = req.headers[headerLower]
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey
    if (typeof key !== 'string' || key.length === 0) {
      if (required) {
        sendError(res, `${headerName} header is required`, 400, {
          code: 'IDEMPOTENCY_KEY_REQUIRED',
        })
        return
      }
      return next()
    }

    let cached: IdempotencyRecord | null
    try {
      cached = (await store.get(key)) ?? null
    } catch (err) {
      sendError(res, 'Idempotency store unavailable', 500, {
        code: 'IDEMPOTENCY_STORE_ERROR',
        details: err instanceof Error ? { message: err.message } : undefined,
      })
      return
    }

    const requestHash = hashRequest?.(req)

    if (cached) {
      if (
        cached.requestHash !== undefined &&
        requestHash !== undefined &&
        cached.requestHash !== requestHash
      ) {
        sendError(
          res,
          `${headerName} reused with a different request body — refusing to replay`,
          422,
          { code: 'IDEMPOTENCY_KEY_REUSE_MISMATCH' }
        )
        return
      }
      // Replay — restore Content-Type so JSON consumers parse correctly.
      for (const [name, value] of Object.entries(cached.headers)) {
        res.setHeader(name, value)
      }
      res.setHeader(REPLAYED_HEADER, 'true')
      res.status(cached.status).send(cached.body)
      return
    }

    instrumentResponse(res, snapshot => {
      const record: IdempotencyRecord = {
        status: snapshot.status,
        body: snapshot.body,
        headers: snapshot.contentType ? { 'Content-Type': snapshot.contentType } : {},
        storedAt: Date.now(),
      }
      if (requestHash !== undefined) record.requestHash = requestHash
      // Store is awaited but we never let a write failure crash the request
      // — the response has already been delivered to the caller.
      Promise.resolve(store.set(key, record)).catch(() => {
        // Intentionally swallowed; observability tooling should hook the
        // store impl directly to surface persistence failures.
      })
    })

    next()
  }
}
