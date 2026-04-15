/**
 * Typed API error thrown by the SDK.
 *
 * Always carries an HTTP-like `status` (0 for network errors) and a
 * human-readable `message` already parsed via `parseApiError`.
 *
 * Optional fields:
 * - `code` : machine-readable error code (e.g. `RATE_LIMIT_EXCEEDED`).
 * - `retryAfter` : seconds before retry is allowed (typically for 429).
 * - `data` : raw error body (as parsed from the response).
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly data?: unknown
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

    // Preserve prototype chain for `instanceof` checks
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * Type guard to narrow `unknown` values to `ApiError`.
   */
  static isApiError(value: unknown): value is ApiError {
    return value instanceof ApiError
  }
}
