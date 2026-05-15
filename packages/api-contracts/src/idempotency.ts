/**
 * Idempotency contracts.
 *
 * Wire contract for the `Idempotency-Key` header used to safely retry write
 * requests without applying the side effect twice. Pattern modeled on Stripe:
 * client generates a UUID v4 per logical operation, server caches the
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
 * Constrained to a valid UUID v4. Stricter than the IETF draft (which allows
 * any opaque string up to 255 chars) — using UUID v4 means clients cannot
 * accidentally collide on values like `'1'` or `'test'` and gives the server
 * a uniform-cardinality cache key.
 *
 * Servers should `IdempotencyKeySchema.parse(req.header(IDEMPOTENCY_KEY_HEADER))`
 * before touching the cache; on failure, respond with
 * {@link ErrorCode.IDEMPOTENCY_KEY_INVALID}.
 *
 * @example
 * ```ts
 * IdempotencyKeySchema.parse(crypto.randomUUID())        // ok
 * IdempotencyKeySchema.parse('1')                        // throws
 * IdempotencyKeySchema.parse('not-a-uuid')               // throws
 * IdempotencyKeySchema.parse('550e8400-e29b-41d4-a716-446655440000') // ok
 * ```
 */
export const IdempotencyKeySchema = z
  .string()
  .uuid({ message: 'Idempotency-Key must be a valid UUID' })
  .describe('Client-generated UUID per logical write operation (RFC 4122)')

/**
 * Inferred TypeScript type for a parsed idempotency key — opaque UUID string.
 */
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>
