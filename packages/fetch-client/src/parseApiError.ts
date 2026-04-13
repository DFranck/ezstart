import type { ApiError } from './types.js'

/**
 * Parse API error response into human-readable message (always in English)
 *
 * Handles multiple API error formats (priority order):
 * - Zod validation errors: { success: false, error: "Invalid request", details: [{ message, path, code }] }
 *   → Returns the first detail's message (more specific than top-level error)
 * - Rate limit errors: { error: { message, code, retryAfter } }
 * - Validation errors: { error: { message, code } }
 * - Standard errors: { error: "message" }
 * - Legacy errors: { message: "..." }
 *
 * @example
 * ```ts
 * const response = await callApi('/users', { appName: 'ezbill', method: 'POST', body })
 * if (!response.ok) {
 *   const errorMessage = parseApiError(response.data)
 *   toast.error(errorMessage) // ✅ Shows "Password must be at least 8 characters"
 * }
 * ```
 */
export function parseApiError(errorData: ApiError | null | undefined): string {
  // Null/undefined fallback
  if (!errorData) {
    return 'An unexpected error occurred. Please try again.'
  }

  // Handle Zod validation details (highest priority — most specific)
  // Example: { success: false, error: "Invalid request", details: [{ message: "Password must be at least 8 characters", path: ["newPassword"], code: "too_small" }] }
  if ('details' in errorData && Array.isArray(errorData.details) && errorData.details.length > 0) {
    const firstDetail = errorData.details[0] as { message?: unknown } | null | undefined
    if (firstDetail && typeof firstDetail.message === 'string' && firstDetail.message.length > 0) {
      return firstDetail.message
    }
  }

  // Handle nested error object (current standard format)
  // Example: { error: { message: "...", code: "..." } }
  if (typeof errorData.error === 'object' && errorData.error !== null) {
    const nestedError = errorData.error as { message?: string }
    if (nestedError.message) {
      return nestedError.message
    }
  }

  // Handle flat error string (legacy format)
  // Example: { error: "Invalid credentials" }
  if (typeof errorData.error === 'string') {
    return errorData.error
  }

  // Handle direct message field (some APIs)
  // Example: { message: "User not found" }
  if ('message' in errorData && typeof errorData.message === 'string') {
    return errorData.message
  }

  // Fallback: stringify the error object (should rarely happen)
  return 'An error occurred. Please try again.'
}

/**
 * Extract a machine-readable error code from an API error response.
 *
 * Supports both error code formats used across @ezstart APIs:
 * - Top-level code: `{ success: false, error: "...", code: "INVALID_OR_EXPIRED_TOKEN" }`
 * - Nested code:    `{ error: { message: "...", code: "RATE_LIMIT_EXCEEDED" } }`
 *
 * @returns The error code string if found, or `undefined` otherwise.
 *
 * @example
 * ```ts
 * const response = await callApi('/auth/reset-password', { appName: 'ezauth', method: 'POST', body })
 * if (!response.ok) {
 *   const code = parseApiErrorCode(response.data)
 *   if (code === 'INVALID_OR_EXPIRED_TOKEN') {
 *     // Show "link expired" UI
 *   }
 * }
 * ```
 */
export function parseApiErrorCode(errorData: ApiError | null | undefined): string | undefined {
  if (!errorData) return undefined

  // Top-level code (new standard format)
  if (typeof errorData.code === 'string' && errorData.code.length > 0) {
    return errorData.code
  }

  // Nested code (rate limit / validation format)
  if (typeof errorData.error === 'object' && errorData.error !== null) {
    const nestedError = errorData.error as { code?: unknown }
    if (typeof nestedError.code === 'string' && nestedError.code.length > 0) {
      return nestedError.code
    }
  }

  return undefined
}
