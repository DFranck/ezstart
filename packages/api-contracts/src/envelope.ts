/**
 * Envelope contracts.
 *
 * Every JSON response from an `@ezstart`-compatible API is one of two shapes:
 *
 * - `{ success: true,  data: T, meta?: ApiMeta }` — see {@link SuccessResponse}
 * - `{ success: false, error: ErrorPayload | string }` — see {@link ErrorResponse}
 *
 * Servers produce these via helpers (`sendSuccess`, `sendError`) and clients
 * discriminate via the exported type guards {@link isSuccessResponse} and
 * {@link isErrorResponse}.
 *
 * Keeping this shape stable across every service is what lets
 * `@ezstart/api-sdk` transparently unwrap `data` and throw on failure without
 * any per-endpoint plumbing.
 */

import type { ApiMeta } from './pagination.js'

/**
 * Successful response envelope.
 *
 * `data` always carries the payload. `meta` is present on paginated
 * endpoints (see {@link PaginationMeta}) and may be extended by APIs that
 * need additional context (timing, cursors, etc.).
 *
 * @example
 * ```ts
 * const body: SuccessResponse<{ id: string }> = {
 *   success: true,
 *   data: { id: 'u_123' },
 * }
 * ```
 */
export type SuccessResponse<T = unknown> = {
  success: true
  data: T
  meta?: ApiMeta
}

/**
 * Structured error payload.
 *
 * - `message`    : human-readable (locale-independent, safe to log)
 * - `code`       : machine-readable short identifier (see `ErrorCode`)
 * - `details`    : optional — Zod issues, server diagnostics, etc.
 * - `retryAfter` : optional — seconds to wait before retrying (429 responses)
 *
 * Servers SHOULD always return this object form. The plain-string form on
 * {@link ErrorResponse} is kept only for legacy back-compat.
 *
 * @example
 * ```ts
 * const err: ErrorPayload = {
 *   message: 'Too many requests',
 *   code: 'RATE_LIMIT_EXCEEDED',
 *   retryAfter: 60,
 * }
 * ```
 */
export type ErrorPayload = {
  message: string
  code?: string
  details?: unknown
  retryAfter?: number
}

/**
 * Failure response envelope.
 *
 * `error` is normally an {@link ErrorPayload}. The `string` union is accepted
 * for backward compatibility with legacy endpoints that still emit
 * `{ success: false, error: 'something went wrong' }`.
 *
 * @example
 * ```ts
 * const body: ErrorResponse = {
 *   success: false,
 *   error: { message: 'Not found', code: 'NOT_FOUND' },
 * }
 * ```
 */
export type ErrorResponse = {
  success: false
  error: ErrorPayload | string
}

/**
 * Discriminated union of all valid API response bodies.
 *
 * Narrow with {@link isSuccessResponse} / {@link isErrorResponse} before
 * accessing `.data` or `.error`.
 *
 * @example
 * ```ts
 * const body: ApiResponse<User> = await fetchJson('/api/users/me')
 * if (isSuccessResponse(body)) {
 *   body.data.email // → string, fully typed
 * } else {
 *   body.error // → ErrorPayload | string
 * }
 * ```
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

/**
 * Type guard for successful response envelopes.
 *
 * Returns `true` only when `body` is a non-null object with `success === true`.
 * Safe to call on arbitrary `unknown` values (JSON parsed bodies).
 *
 * @example
 * ```ts
 * if (isSuccessResponse<User>(body)) {
 *   body.data // User — fully typed
 * }
 * ```
 */
export function isSuccessResponse<T = unknown>(body: unknown): body is SuccessResponse<T> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as { success: unknown }).success === true
  )
}

/**
 * Type guard for failure response envelopes.
 *
 * Returns `true` only when `body` is a non-null object with `success === false`.
 * Safe to call on arbitrary `unknown` values (JSON parsed bodies).
 *
 * @example
 * ```ts
 * if (isErrorResponse(body)) {
 *   const message = typeof body.error === 'string' ? body.error : body.error.message
 * }
 * ```
 */
export function isErrorResponse(body: unknown): body is ErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as { success: unknown }).success === false
  )
}
