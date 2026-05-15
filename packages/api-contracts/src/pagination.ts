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
 * Rejects strings containing any ASCII control character (`\x00`-`\x1F`,
 * `\x7F`) — i.e. NUL, BEL, BS, TAB, LF, VT, FF, CR, ESC, DEL, etc.
 *
 * Applied to opaque pagination cursors so a raw `\r\n` cannot:
 * - Smuggle into a `Link: <…?cursor=…>` response header (RFC 5988 sibling
 *   of HTTP response splitting).
 * - Break unstructured log formatters (`console.log`, text-mode pino) that
 *   would print a literal newline mid-line.
 * - Decode to a control char inside a server-side base64 cursor blob.
 *
 * No legitimate cursor encoding (base64url, hex, JWT, signed token) emits
 * raw ASCII control bytes, so this filter is pure defense-in-depth with no
 * legitimate-traffic impact.
 *
 * @internal
 */
const NO_CONTROL_CHARS = /^[^\x00-\x1F\x7F]*$/

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

// ---------------------------------------------------------------------------
// Cursor pagination (for large or write-heavy collections)
// ---------------------------------------------------------------------------

/**
 * Zod schema for cursor-based pagination query parameters.
 *
 * Use cursor pagination instead of offset/limit when:
 * - the collection is large (offset > 10_000 hurts on Mongo `skip()`),
 * - the collection is write-heavy (inserts shift offsets and produce
 *   duplicates / skips between pages),
 * - the API wants stable resumability across long-lived iterators.
 *
 * Shape:
 * - `cursor` : opaque server-issued string from the previous page's
 *   `nextCursor` meta. Omit on the first page.
 * - `limit`  : page size, 1..100 (default 50). Same strict parser as
 *   {@link PaginationQuerySchema} — hex / scientific / arrays / booleans
 *   rejected.
 *
 * The cursor format is intentionally opaque on the wire (clients MUST NOT
 * parse it). Servers typically encode `{ field, value, id }` as base64url
 * or sign it with HMAC to prevent tampering.
 *
 * @example
 * ```ts
 * // server
 * const { cursor, limit } = CursorPaginationQuerySchema.parse(req.query)
 * const where = cursor ? { _id: { $gt: decodeCursor(cursor) } } : {}
 * const rows = await User.find(where).sort({ _id: 1 }).limit(limit + 1)
 * const hasMore = rows.length > limit
 * const page = rows.slice(0, limit)
 * const nextCursor = hasMore ? encodeCursor(page[page.length - 1]._id) : null
 * ```
 */
export const CursorPaginationQuerySchema = z.object({
  cursor: z
    .string()
    .min(1, 'Cursor must be a non-empty string')
    .max(2048, 'Cursor must be at most 2048 characters')
    .regex(NO_CONTROL_CHARS, 'cursor must not contain control characters')
    .optional()
    .describe('Opaque server-issued cursor from the previous page (omit on first page)'),
  limit: StrictPositiveInt.refine(n => n <= 100, 'Must be at most 100')
    .default(50)
    .describe('Page size (1-100, default 50)'),
})

/**
 * Inferred TypeScript type for a parsed cursor-pagination query.
 *
 * @example
 * ```ts
 * function listEvents(query: CursorPaginationQuery) {
 *   // query.cursor is `string | undefined`, query.limit is `number`
 * }
 * ```
 */
export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>

/**
 * Zod schema for the meta block returned alongside a cursor-paginated payload.
 *
 * Mandatory:
 * - `nextCursor` : opaque string for the next page, or `null` when no more
 *   results.
 * - `hasMore`    : `true` when more results exist beyond this page.
 *
 * Intentionally omits `totalCount` — cursor pagination's whole point is that
 * the server does not need to count the full collection to answer a page
 * request. Clients that need a count must call a dedicated `/count` endpoint
 * (and accept it may be approximate).
 *
 * @example
 * ```ts
 * const meta = CursorPaginationMetaSchema.parse({
 *   nextCursor: 'eyJpZCI6IjY1OWFmIn0',
 *   hasMore: true,
 * })
 * ```
 */
export const CursorPaginationMetaSchema = z.object({
  nextCursor: z
    .string()
    .min(1)
    .max(2048)
    .nullable()
    .describe('Cursor to fetch the next page, or null when no more results'),
  hasMore: z.boolean().describe('Whether more results exist beyond this page'),
})

/**
 * Inferred TypeScript type for a cursor-pagination meta block.
 */
export type CursorPaginationMeta = z.infer<typeof CursorPaginationMetaSchema>

/**
 * Canonical shape of a cursor-paginated list response's *payload*.
 *
 * Typically wrapped inside a {@link SuccessResponse} on the wire:
 *
 * ```json
 * { "success": true, "data": [...], "meta": { "nextCursor": "abc", "hasMore": true } }
 * ```
 *
 * @example
 * ```ts
 * const page: CursorPaginatedResponse<Event> = await apiCall('/events', {
 *   appName: 'myapp',
 *   preserveEnvelope: true,
 * })
 * page.data // → Event[]    page.meta.nextCursor // → string | null
 * ```
 */
export type CursorPaginatedResponse<T> = {
  data: T[]
  meta: CursorPaginationMeta
}
