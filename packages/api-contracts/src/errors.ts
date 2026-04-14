/**
 * Standardized error codes used across `@ezstart`-compatible APIs.
 *
 * These strings are part of the public wire contract — clients match on them
 * to decide retry/refresh/logout behavior, show localized messages, etc.
 *
 * ### Maintenance rules
 *
 * - Add NEW codes in the matching section below (alphabetical within section).
 * - NEVER rename or remove an existing code without a major version bump —
 *   clients in the wild depend on the literal strings.
 * - String values mirror the key names (no transformation) so that JSON
 *   logs and tooling don't need any mapping.
 *
 * @example
 * ```ts
 * import { ErrorCode } from '@ezstart/api-contracts'
 *
 * if (err.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
 *   await sleep(err.retryAfter ?? 60)
 * }
 * ```
 */
export const ErrorCode = {
  // --- Auth (authentication) ------------------------------------------------
  /** No/invalid credentials — the request was not authenticated. */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** Access token is malformed or has a bad signature. */
  INVALID_TOKEN: 'INVALID_TOKEN',
  /** Token was valid but is no longer accepted (expired / revoked). */
  INVALID_OR_EXPIRED_TOKEN: 'INVALID_OR_EXPIRED_TOKEN',
  /** Account requires email verification before proceeding. */
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  /** 2FA code required to complete the flow. */
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',

  // --- Authorization --------------------------------------------------------
  /** Authenticated but not allowed to perform this action. */
  FORBIDDEN: 'FORBIDDEN',

  // --- Validation -----------------------------------------------------------
  /** Request body or query failed schema validation. */
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // --- Resources ------------------------------------------------------------
  /** The requested resource does not exist. */
  NOT_FOUND: 'NOT_FOUND',
  /** A resource with the same unique key already exists. */
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  /** Generic conflict (stale update, incompatible state, etc.). */
  CONFLICT: 'CONFLICT',

  // --- Rate limiting --------------------------------------------------------
  /** Request rejected by a rate limiter — check `retryAfter`. */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // --- Network / Server -----------------------------------------------------
  /** Client-side network failure (fetch threw). */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Server-side uncaught error (5xx). */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Upstream dependency unavailable / health check failing. */
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

/**
 * Union of all standard error code string literals.
 *
 * Use as a type for fields that MUST be one of the known codes. Custom
 * app-specific codes can be represented as `ErrorCode | string` (union
 * widening) — consumers still get IntelliSense on the known values.
 *
 * @example
 * ```ts
 * function handle(code: ErrorCode) {
 *   // only valid codes accepted
 * }
 * ```
 */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
