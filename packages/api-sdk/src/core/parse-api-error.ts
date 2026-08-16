import type { ApiErrorPayload } from './types.js'

/**
 * Parse an API error payload into a human-readable message (English).
 *
 * Handles formats (priority order):
 * 1. Zod validation (root)   : `{ details: [{ message, path, code }] }` → first detail's `message`
 * 2. Zod validation (nested) : `{ error: { details: [{ message, path }] } }` → first detail's `message`
 * 3. Nested object           : `{ error: { message, code } }` → `error.message`
 * 4. Flat string             : `{ error: 'Invalid credentials' }` → the string
 * 5. Direct message          : `{ message: 'User not found' }` → the message
 * 6. Fallback                : generic "An error occurred."
 *
 * Returns `null` ONLY when the input is nullish/empty — callers may use this
 * to detect "no error payload" cases. All other cases produce a string.
 */
export function parseApiError(errorData: unknown): string | null {
  if (errorData === null || errorData === undefined) return null

  // Primitive string → return as-is
  if (typeof errorData === 'string') {
    return errorData.length > 0 ? errorData : null
  }

  if (typeof errorData !== 'object') {
    return 'An error occurred. Please try again.'
  }

  const payload = errorData as ApiErrorPayload

  // Empty object guard
  if (Object.keys(payload).length === 0) return null

  // 1. Zod validation details at root (most specific)
  if (Array.isArray(payload.details) && payload.details.length > 0) {
    const first = payload.details[0] as { message?: unknown } | null | undefined
    if (first && typeof first.message === 'string' && first.message.length > 0) {
      return first.message
    }
  }

  // 2. Zod validation details nested inside error envelope
  //    (e.g. `{ success: false, error: { code, message, details: [...] } }`)
  //    The nested detail's message is more specific than the generic
  //    `error.message`, so it MUST be checked before path 3.
  if (typeof payload.error === 'object' && payload.error !== null) {
    const nested = payload.error as { details?: unknown }
    if (Array.isArray(nested.details) && nested.details.length > 0) {
      const first = nested.details[0] as { message?: unknown } | null | undefined
      if (first && typeof first.message === 'string' && first.message.length > 0) {
        return first.message
      }
    }
  }

  // 3. Nested error object message
  if (typeof payload.error === 'object' && payload.error !== null) {
    const nested = payload.error as { message?: unknown }
    if (typeof nested.message === 'string' && nested.message.length > 0) {
      return nested.message
    }
  }

  // 4. Flat error string
  if (typeof payload.error === 'string' && payload.error.length > 0) {
    return payload.error
  }

  // 5. Direct message
  if (typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message
  }

  return 'An error occurred. Please try again.'
}

/**
 * Extract a machine-readable error code from an API error payload.
 *
 * Supports:
 * - Top-level : `{ code: 'INVALID_TOKEN' }`
 * - Nested    : `{ error: { code: 'RATE_LIMIT_EXCEEDED' } }`
 */
export function parseApiErrorCode(errorData: unknown): string | undefined {
  if (!errorData || typeof errorData !== 'object') return undefined

  const payload = errorData as ApiErrorPayload

  if (typeof payload.code === 'string' && payload.code.length > 0) {
    return payload.code
  }

  if (typeof payload.error === 'object' && payload.error !== null) {
    const nested = payload.error as { code?: unknown }
    if (typeof nested.code === 'string' && nested.code.length > 0) {
      return nested.code
    }
  }

  return undefined
}

/**
 * Maximum retry-after value (seconds) the SDK will honor.
 *
 * Capped at 1 hour to prevent a malicious server from blocking clients
 * indefinitely with an extreme `retryAfter` value.
 */
const MAX_RETRY_AFTER_SECONDS = 3600

/**
 * Extract retry-after hint from an API error payload (seconds).
 *
 * Supports:
 * - Top-level : `{ retryAfter: 60 }` or `{ retryAfter: '60' }`
 * - Nested    : `{ error: { retryAfter: '60' } }`
 *
 * Values are capped at {@link MAX_RETRY_AFTER_SECONDS} (3600 = 1 hour)
 * to prevent a malicious server from blocking clients indefinitely.
 */
export function parseRetryAfter(errorData: unknown): number | undefined {
  if (!errorData || typeof errorData !== 'object') return undefined

  const payload = errorData as ApiErrorPayload

  const candidates: unknown[] = [payload.retryAfter]
  if (typeof payload.error === 'object' && payload.error !== null) {
    candidates.push((payload.error as { retryAfter?: unknown }).retryAfter)
  }

  for (const raw of candidates) {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      return Math.min(raw, MAX_RETRY_AFTER_SECONDS)
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.min(parsed, MAX_RETRY_AFTER_SECONDS)
      }
    }
  }

  return undefined
}
