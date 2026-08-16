/**
 * Pay-specific error handling — 100% agnostic, zero `@ezstart/*` runtime deps.
 *
 * This module replaces the previous `parseApiError` import from
 * `@ezstart/api-sdk`, so the agnostic `core/` layer can be consumed standalone
 * (Vue / Svelte / vanilla / Node) without pulling the HTTP SDK at runtime.
 *
 * It mirrors the auth-sdk `core/errors.ts` + `auth-client/context.ts` pattern:
 * a typed {@link PayError} carrying `code` / `statusCode` / `details`, plus a
 * {@link parsePayError} message extractor whose priority order is byte-for-byte
 * identical to api-sdk's `parseApiError` (so existing message-string matching —
 * e.g. `classifyPayError` — keeps working unchanged).
 */

/**
 * A single Zod-style validation issue surfaced by the API inside the error
 * envelope (`{ error: { details: [...] } }` or root `{ details: [...] }`).
 */
export interface PayErrorDetail {
  /** Human-readable message for this specific field/issue. */
  readonly message?: string
  /** Field path (e.g. `['amount']`). */
  readonly path?: ReadonlyArray<string | number>
  /** Machine-readable issue code (e.g. `'too_small'`). */
  readonly code?: string
}

/**
 * Payment SDK error.
 *
 * Drop-in compatible with the previous `new Error(parseApiError(...) ?? '…')`
 * throws: it `extends Error`, so every `err instanceof Error` / `err.message`
 * consumer (the React provider, hooks, and `classifyPayError`) keeps working.
 * On top of that it carries the HTTP `statusCode`, a machine-readable `code`,
 * and the raw validation `details` so consumers can `switch` on the code or
 * surface field-level errors instead of brittle message-string matching.
 *
 * cf. standard-sdk-dx.md §4 (typed Error class with `code` / `statusCode` /
 * `details`).
 *
 * @example
 * ```ts
 * try {
 *   await client.createPlan(data)
 * } catch (err) {
 *   if (PayError.isPayError(err) && err.statusCode === 403) {
 *     // forbidden — show an upgrade prompt
 *   }
 * }
 * ```
 */
export class PayError extends Error {
  /** HTTP status code (`0` when the failure happened before a response). */
  readonly statusCode: number
  /** Machine-readable error code from the API envelope, when present. */
  readonly code: string | undefined
  /** Raw validation details from the API envelope, when present. */
  readonly details: ReadonlyArray<PayErrorDetail> | undefined

  constructor(
    message: string,
    statusCode = 0,
    options?: { code?: string; details?: ReadonlyArray<PayErrorDetail> }
  ) {
    super(message)
    this.name = 'PayError'
    this.statusCode = statusCode
    this.code = options?.code
    this.details = options?.details
  }

  /** Type guard. */
  static isPayError(err: unknown): err is PayError {
    return err instanceof PayError
  }
}

/**
 * Parse an API error payload into a human-readable message (English).
 *
 * Priority order (identical to api-sdk `parseApiError`, kept in sync so the
 * exact message text produced for any payload is unchanged):
 * 1. Zod validation (root)   : `{ details: [{ message }] }` → first detail's `message`
 * 2. Zod validation (nested) : `{ error: { details: [{ message }] } }` → first detail's `message`
 * 3. Nested object           : `{ error: { message } }` → `error.message`
 * 4. Flat string             : `{ error: 'Invalid credentials' }` → the string
 * 5. Direct message          : `{ message: 'User not found' }` → the message
 * 6. Fallback                : generic "An error occurred."
 *
 * Returns `null` ONLY when the input is nullish/empty — callers may use this
 * to detect "no error payload" cases (then fall back to their own default).
 */
export function parsePayError(errorData: unknown): string | null {
  if (errorData === null || errorData === undefined) return null

  // Primitive string → return as-is
  if (typeof errorData === 'string') {
    return errorData.length > 0 ? errorData : null
  }

  if (typeof errorData !== 'object') {
    return 'An error occurred. Please try again.'
  }

  const payload = errorData as Record<string, unknown>

  // Empty object guard
  if (Object.keys(payload).length === 0) return null

  // 1. Zod validation details at root (most specific)
  const rootDetailMessage = firstDetailMessage(payload.details)
  if (rootDetailMessage) return rootDetailMessage

  // 2. Zod validation details nested inside error envelope
  //    (e.g. `{ success: false, error: { code, message, details: [...] } }`)
  //    The nested detail's message is more specific than the generic
  //    `error.message`, so it MUST be checked before path 3.
  if (isRecord(payload.error)) {
    const nestedDetailMessage = firstDetailMessage(payload.error.details)
    if (nestedDetailMessage) return nestedDetailMessage
  }

  // 3. Nested error object message
  if (isRecord(payload.error) && isNonEmptyString(payload.error.message)) {
    return payload.error.message
  }

  // 4. Flat error string
  if (isNonEmptyString(payload.error)) return payload.error

  // 5. Direct message
  if (isNonEmptyString(payload.message)) return payload.message

  return 'An error occurred. Please try again.'
}

/**
 * Extract a machine-readable error code from an API error payload.
 *
 * Supports:
 * - Top-level : `{ code: 'PAY_CARD_DECLINED' }`
 * - Nested    : `{ error: { code: 'RATE_LIMIT_EXCEEDED' } }`
 *
 * Returns `undefined` when no code is present.
 */
export function parsePayErrorCode(errorData: unknown): string | undefined {
  if (!isRecord(errorData)) return undefined

  if (isNonEmptyString(errorData.code)) return errorData.code

  if (isRecord(errorData.error) && isNonEmptyString(errorData.error.code)) {
    return errorData.error.code
  }

  return undefined
}

/**
 * Extract the raw validation `details` array from an API error payload, from
 * either the root (`{ details: [...] }`) or the nested error envelope
 * (`{ error: { details: [...] } }`). Returns `undefined` when absent.
 */
function parsePayErrorDetails(errorData: unknown): ReadonlyArray<PayErrorDetail> | undefined {
  if (!isRecord(errorData)) return undefined

  if (Array.isArray(errorData.details) && errorData.details.length > 0) {
    return errorData.details as ReadonlyArray<PayErrorDetail>
  }

  if (isRecord(errorData.error) && Array.isArray(errorData.error.details)) {
    const nested = errorData.error.details
    if (nested.length > 0) return nested as ReadonlyArray<PayErrorDetail>
  }

  return undefined
}

/**
 * Build a typed {@link PayError} from a parsed response body + HTTP status.
 *
 * The message preserves the previous `parseApiError(body) ?? fallback`
 * behaviour exactly: when the body carries no extractable message the provided
 * `fallback` is used verbatim. The `code` and `details` are surfaced additively
 * so consumers can branch on them without breaking message-string matching.
 *
 * @param body     Parsed JSON response body (`await response.json()`).
 * @param status   HTTP status code of the failing response.
 * @param fallback Message used when the body has no extractable error text.
 *
 * @example
 * ```ts
 * if (!response.ok) {
 *   throw payErrorFromResponse(result, response.status, 'Failed to create plan')
 * }
 * ```
 */
export function payErrorFromResponse(body: unknown, status: number, fallback: string): PayError {
  return new PayError(parsePayError(body) ?? fallback, status, {
    code: parsePayErrorCode(body),
    details: parsePayErrorDetails(body),
  })
}

/** `true` when `value` is a non-null object (record). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** `true` when `value` is a string of length > 0. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Return the first detail's non-empty `message`, when `value` is a non-empty
 * array of details. Returns `undefined` otherwise.
 */
function firstDetailMessage(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const first = value[0] as { message?: unknown } | null | undefined
  if (first && isNonEmptyString(first.message)) return first.message
  return undefined
}
