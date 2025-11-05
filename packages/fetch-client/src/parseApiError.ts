import type { ApiError } from './types'

/**
 * Parse API error response into human-readable message (always in English)
 * 
 * Handles multiple API error formats:
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
 *   toast.error(errorMessage) // ✅ Shows "User email already exists"
 * }
 * ```
 */
export function parseApiError(errorData: ApiError | null | undefined): string {
  // Null/undefined fallback
  if (!errorData) {
    return 'An unexpected error occurred. Please try again.'
  }

  // Handle nested error object (current standard format)
  // Example: { error: { message: "...", code: "..." } }
  if (typeof errorData.error === 'object' && errorData.error !== null) {
    const nestedError = errorData.error as any
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
