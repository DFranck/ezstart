/**
 * Pagination contracts.
 *
 * Standard shape for any GET list endpoint in the @ezstart ecosystem.
 * Clients and servers both import from here to guarantee wire compatibility.
 */

import { z } from 'zod'

/**
 * Permissive `meta` shape used by generic envelope responses.
 *
 * Concrete paginated responses use the stricter {@link PaginationMeta}.
 * The `[key: string]: unknown` index signature keeps it extensible — APIs
 * may add custom meta fields (cursor, hasNextPage, etc.) without breaking
 * existing consumers.
 *
 * @example
 * ```ts
 * const meta: ApiMeta = { total: 42, limit: 50, offset: 0, cursor: 'abc' }
 * ```
 */
export type ApiMeta = {
  total?: number
  limit?: number
  offset?: number
  [key: string]: unknown
}

/**
 * Required pagination metadata for list endpoints.
 *
 * Always present on responses produced by endpoints that accept
 * {@link PaginationQuery}. Clients can rely on all three fields being numbers.
 *
 * @example
 * ```ts
 * const meta: PaginationMeta = { total: 42, limit: 50, offset: 0 }
 * const hasMore = meta.offset + meta.limit < meta.total
 * ```
 */
export type PaginationMeta = {
  total: number
  limit: number
  offset: number
}

/**
 * Canonical shape of a paginated list response's *payload*.
 *
 * Typically wrapped inside a {@link SuccessResponse} on the wire:
 *
 * ```json
 * { "success": true, "data": [...], "meta": { "total": 42, "limit": 50, "offset": 0 } }
 * ```
 *
 * When consuming via `@ezstart/api-sdk`, the envelope is unwrapped and you
 * receive the `PaginatedResponse<T>` directly.
 *
 * @example
 * ```ts
 * const page: PaginatedResponse<User> = await apiCall('/users', {
 *   appName: 'myapp',
 *   preserveEnvelope: true,
 * })
 * page.data // → User[]    page.meta.total // → number
 * ```
 */
export type PaginatedResponse<T> = {
  data: T[]
  meta: PaginationMeta
}

/**
 * Strict positive-integer parser used by pagination params.
 *
 * Hardened against the permissive behavior of `z.coerce.number()`, which
 * accepts hex strings (`'0x10'` → 16), scientific notation (`'1e2'` → 100),
 * booleans (`true` → 1), single-element arrays (`[50]` → 50), and objects
 * with a `valueOf()` method. The contract is the SHARED validator between
 * client and server — every consumer agrees on the same parsing rules.
 *
 * Accepted inputs:
 * - Already-a-number: `z.number().int().positive().finite()`
 * - Decimal-only string: `/^\d+$/` then `parseInt(s, 10)`
 *
 * Rejected inputs (verified): hex (`'0x10'`), scientific (`'1e2'`, `'1.5e2'`),
 * arrays (`[50]`, `[]`), booleans (`true`, `false`), null, NaN, Infinity,
 * negatives, zero, floats, whitespace-padded strings, objects with valueOf.
 *
 * @internal
 */
const StrictPositiveInt = z.union([
  z.number().int().positive().finite(),
  z
    .string()
    .regex(/^\d+$/, 'Must be a positive decimal integer (no hex, no scientific notation)')
    .transform(s => Number.parseInt(s, 10))
    .refine(n => Number.isInteger(n) && n > 0 && Number.isFinite(n), 'Must be a positive integer'),
])

/**
 * Strict non-negative-integer parser (offset variant). Accepts 0.
 *
 * Same hardening rules as {@link StrictPositiveInt} but allows zero.
 *
 * @internal
 */
const StrictNonNegativeInt = z.union([
  z.number().int().nonnegative().finite(),
  z
    .string()
    .regex(/^\d+$/, 'Must be a non-negative decimal integer (no hex, no scientific notation)')
    .transform(s => Number.parseInt(s, 10))
    .refine(
      n => Number.isInteger(n) && n >= 0 && Number.isFinite(n),
      'Must be a non-negative integer'
    ),
])

/**
 * Zod schema for the standard pagination query string.
 *
 * - `limit`  : integer 1..100 (default 50, per `standard-saas-data.md` §3)
 * - `offset` : integer 0..10_000 (default 0)
 *
 * Parses query strings (`?limit=50`) using a strict positive-integer parser
 * that rejects hex (`0x10`), scientific notation (`1e2`), booleans, arrays,
 * objects, and whitespace-padded values. See {@link StrictPositiveInt}.
 *
 * The `offset` upper bound of 10_000 mirrors industry-standard soft caps
 * (Stripe, GitHub). Higher offsets force a linear-cost Mongo `skip()` on
 * every request, which is a DoS amplification primitive — switch to cursor
 * pagination for deep lists.
 *
 * Servers should call `PaginationQuerySchema.parse(req.query)` on any GET
 * list endpoint to enforce this contract.
 *
 * @example
 * ```ts
 * // server
 * const { limit, offset } = PaginationQuerySchema.parse(req.query)
 * const users = await User.find().limit(limit).skip(offset)
 * ```
 */
export const PaginationQuerySchema = z.object({
  limit: StrictPositiveInt.refine(n => n <= 100, 'Must be at most 100')
    .default(50)
    .describe('Page size (1-100, default 50)'),
  offset: StrictNonNegativeInt.refine(n => n <= 10_000, 'Must be at most 10000')
    .default(0)
    .describe('Pagination offset (0-based, max 10_000, default 0)'),
})

/**
 * Inferred TypeScript type for a parsed pagination query.
 *
 * @example
 * ```ts
 * function listUsers(query: PaginationQuery) {
 *   // query.limit and query.offset are numbers
 * }
 * ```
 */
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
