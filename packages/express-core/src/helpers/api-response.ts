import type { Response } from 'express'

type Meta = {
  total?: number
  limit?: number
  offset?: number
  [key: string]: unknown
}

/**
 * Send a standardized success response: { success: true, data, meta? }
 */
export function sendSuccess<T>(res: Response, data: T, meta?: Meta) {
  return res.json({ success: true, data, ...(meta ? { meta } : {}) })
}

/**
 * Send a standardized error response: { success: false, error, code? }
 *
 * @param code - Optional machine-readable error code (e.g. 'INVALID_OR_EXPIRED_TOKEN').
 *               Omitted from the response body when not provided.
 */
export function sendError(res: Response, error: string, status = 500, code?: string) {
  return res.status(status).json({ success: false, error, ...(code ? { code } : {}) })
}

/**
 * Send a standardized validation error response: { success: false, error, details }
 */
export function sendValidationError(
  res: Response,
  error: string,
  details: unknown[],
  status = 422
) {
  return res.status(status).json({ success: false, error, details })
}
