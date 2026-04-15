/**
 * Response helpers — emit the envelope shapes defined by `@ezstart/api-contracts`.
 *
 * Use these instead of `res.json()` directly to guarantee every endpoint
 * produces a client-readable `{ success, data, meta? }` or
 * `{ success: false, error }` payload.
 */

import type { Response } from 'express'
import type { ZodError } from 'zod'
import type { ApiMeta } from './types.js'

/**
 * Emit a standardized success envelope: `{ success: true, data, meta? }`.
 *
 * @example
 * ```ts
 * import { sendSuccess } from '@ezstart/api-core'
 *
 * app.get('/items', async (_req, res) => {
 *   const items = await loadItems()
 *   sendSuccess(res, items, { total: items.length, limit: 20, offset: 0 })
 * })
 * ```
 */
export function sendSuccess<T>(res: Response, data: T, meta?: ApiMeta): Response {
  const body: { success: true; data: T; meta?: ApiMeta } = { success: true, data }
  if (meta !== undefined) {
    body.meta = meta
  }
  return res.json(body)
}

/**
 * Extra options for `sendError` — keeps the common `code`/`details`/
 * `retryAfter` hints grouped in a single argument.
 */
export type SendErrorOptions = {
  /** Machine-readable code (see `ErrorCode` from `@ezstart/api-contracts`). */
  code?: string
  /** Optional diagnostic details (Zod issues, server context, etc.). */
  details?: unknown
  /** Seconds the client should wait before retrying (429 responses). */
  retryAfter?: number
}

/**
 * Emit a standardized error envelope: `{ success: false, error: { ... } }`.
 *
 * Unlike the legacy `express-core` helper which used a flat string, this
 * one always produces the structured `ErrorPayload` shape so clients can
 * rely on `body.error.message` / `body.error.code`.
 *
 * @example
 * ```ts
 * sendError(res, 'Item not found', 404, { code: 'NOT_FOUND' })
 * ```
 */
export function sendError(
  res: Response,
  message: string,
  status = 500,
  options: SendErrorOptions = {}
): Response {
  const { code, details, retryAfter } = options
  const error: {
    message: string
    code?: string
    details?: unknown
    retryAfter?: number
  } = { message }
  if (code !== undefined) error.code = code
  if (details !== undefined) error.details = details
  if (retryAfter !== undefined) error.retryAfter = retryAfter
  return res.status(status).json({ success: false, error })
}

/**
 * Emit a validation error envelope from a `ZodError`.
 *
 * Converts Zod issues into `{ path, message, code }` triples under
 * `error.details` and sets the standard `VALIDATION_ERROR` code.
 *
 * @example
 * ```ts
 * const parsed = schema.safeParse(req.body)
 * if (!parsed.success) return sendValidationError(res, parsed.error)
 * ```
 */
export function sendValidationError(
  res: Response,
  zodError: ZodError,
  status = 422,
  message = 'Validation error'
): Response {
  const details = zodError.errors.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))
  return sendError(res, message, status, {
    code: 'VALIDATION_ERROR',
    details,
  })
}
