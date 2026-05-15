/**
 * Idempotency contracts.
 *
 * Wire contract for the `Idempotency-Key` header used to safely retry write
 * requests without applying the side effect twice. Pattern modeled on Stripe:
 * client generates an opaque UUID per logical operation, server caches the
 * response keyed by `(apiKey, idempotencyKey, route, hash(body))` for 24h and
 * replays it on retry.
 *
 * @see standard-saas-data.md §11 (P0 — Idempotency keys on write endpoints)
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
 */

import { z } from 'zod'

/**
 * HTTP header name carrying the idempotency key.
 *
 * Constant on purpose — DO NOT hardcode the literal `'Idempotency-Key'`
 * anywhere else; import this constant so any future rename (e.g. to a vendor
 * prefix) is a single-file change.
 *
 * @example
 * ```ts
 * fetch('/api/donations', {
 *   method: 'POST',
 *   headers: { [IDEMPOTENCY_KEY_HEADER]: crypto.randomUUID() },
 *   body: JSON.stringify(payload),
 * })
 * ```
 */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key' as const

/**
 * How long the server caches the idempotent response keyed by an idempotency
 * key. After this TTL the key is forgotten and a retry will execute the
 * operation fresh (so callers should retry within this window or accept a
 * possible duplicate).
 *
 * `86_400` seconds = 24h, matching the Stripe default.
 */
export const IDEMPOTENCY_CACHE_TTL_SECONDS = 86_400 as const

/**
 * Idempotency-Key header value contract.
 *
 * Opaque client-generated UUID (any RFC 4122 variant — v4 is the historic
 * default emitted by `crypto.randomUUID()`, but v7 is increasingly common
 * in newer libraries and is intentionally accepted here). Stricter than the
 * IETF draft (which allows any opaque string up to 255 chars) — requiring
 * UUID format means clients cannot accidentally collide on values like
 * `'1'` or `'test'` and gives the server a uniform-cardinality cache key.
 *
 * **Choice rationale (Option A, Lot 2.1.1 — 2026-05-16)** — the previous
 * JSDoc claimed "UUID v4 only" but the underlying `z.string().uuid()`
 * validator is version-agnostic (accepts v1/v3/v4/v5/v6/v7/v8/nil). Rather
 * than tighten the regex to v4-only (which would reject the modern v7
 * default), the documentation is corrected to match the runtime — every
 * RFC 4122 UUID variant is accepted. Real-world consumers (Postgres `gen_random_uuid()`,
 * Node `crypto.randomUUID()`, libs emitting v7) all work uniformly. Stripe
 * accepts arbitrary opaque keys up to 255 chars — we remain stricter by
 * requiring UUID shape.
 *
 * Servers should `IdempotencyKeySchema.parse(req.header(IDEMPOTENCY_KEY_HEADER))`
 * before touching the cache; on failure, respond with
 * {@link ErrorCode.IDEMPOTENCY_KEY_INVALID}.
 *
 * @example
 * ```ts
 * IdempotencyKeySchema.parse(crypto.randomUUID())        // ok (v4 in Node, v7 in some libs)
 * IdempotencyKeySchema.parse('1')                        // throws
 * IdempotencyKeySchema.parse('not-a-uuid')               // throws
 * IdempotencyKeySchema.parse('550e8400-e29b-41d4-a716-446655440000') // ok (v4)
 * IdempotencyKeySchema.parse('018f7c5e-1234-7000-8000-000000000000') // ok (v7)
 * ```
 */
export const IdempotencyKeySchema = z
  .string()
  .uuid({ message: 'Idempotency-Key must be a valid UUID' })
  .describe('Client-generated UUID per logical write operation (RFC 4122, any variant)')

/**
 * Inferred TypeScript type for a parsed idempotency key — opaque UUID string.
 */
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>
