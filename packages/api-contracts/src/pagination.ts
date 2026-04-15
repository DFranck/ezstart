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
 * const meta: ApiMeta = { total: 42, limit: 20, offset: 0, cursor: 'abc' }
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
 * const meta: PaginationMeta = { total: 42, limit: 20, offset: 0 }
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
 * { "success": true, "data": [...], "meta": { "total": 42, "limit": 20, "offset": 0 } }
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
 * Zod schema for the standard pagination query string.
 *
 * - `limit`  : integer 1..100 (default 20)
 * - `offset` : integer >= 0 (default 0)
 *
 * Uses `z.coerce.number()` so it parses query strings (`?limit=50`) directly.
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
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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
