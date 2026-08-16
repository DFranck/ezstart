/**
 * Canonical typed error class for `@ezstart`-compatible APIs.
 *
 * Single source of truth for "something went wrong on the wire". Lives here
 * (and not in `@ezstart/api-sdk`) so that:
 *
 * - **Servers** (`@ezstart/api-core`) can `throw new ApiError(...)` without
 *   creating a backward dependency on a client SDK.
 * - **Clients** (`@ezstart/api-sdk`, `@ezstart/auth-sdk`, `@ezstart/pay-sdk`)
 *   can `catch (err)` and narrow to the exact same class.
 *
 * The `code` field is intentionally typed `string` (not the {@link ErrorCode}
 * union) so that consumers may attach domain-specific codes without losing
 * the class identity. Use the {@link ErrorCode} enum as the source for the
 * known codes, but the wire contract does not lock the field to that subset.
 *
 * @example
 * ```ts
 * // server side
 * import { ApiError, ErrorCode } from '@ezstart/api-contracts'
 *
 * if (!user) {
 *   throw new ApiError('User not found', {
 *     status: 404,
 *     code: ErrorCode.NOT_FOUND,
 *   })
 * }
 * ```
 *
 * @example
 * ```ts
 * // client side
 * import { ApiError, ErrorCode } from '@ezstart/api-contracts'
 *
 * try {
 *   await apiCall('/me')
 * } catch (err) {
 *   if (ApiError.isApiError(err) && err.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
 *     await sleep((err.retryAfter ?? 60) * 1000)
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /**
   * HTTP-like status code.
   *
   * Use `0` for client-side network failures (fetch threw / no response).
   */
  public readonly status: number

  /**
   * Machine-readable error code (e.g. {@link ErrorCode}). Optional because
   * legacy servers may omit it from the envelope.
   */
  public readonly code?: string

  /**
   * Raw error body as parsed from the response. Typically the deserialized
   * JSON, or a string fallback when the body is not JSON.
   */
  public readonly data?: unknown

  /**
   * Seconds to wait before retrying. Typically populated for `429` responses
   * (parsed from the `Retry-After` header or the `retryAfter` field).
   */
  public readonly retryAfter?: number

  constructor(
    message: string,
    opts: {
      status: number
      code?: string
      data?: unknown
      retryAfter?: number
    }
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = opts.status
    this.code = opts.code
    this.data = opts.data
    this.retryAfter = opts.retryAfter

    // Preserve prototype chain for `instanceof` checks across realms.
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * Type guard to narrow an `unknown` value to {@link ApiError}.
   *
   * Use this in `catch` blocks instead of `err instanceof ApiError` when you
   * cannot guarantee the runtime contains a single class realm (e.g. SSR +
   * client bundles, esbuild test transforms).
   *
   * @example
   * ```ts
   * try { await apiCall('/me') }
   * catch (err) {
   *   if (ApiError.isApiError(err)) console.log(err.code, err.status)
   * }
   * ```
   */
  static isApiError(value: unknown): value is ApiError {
    return value instanceof ApiError
  }
}
