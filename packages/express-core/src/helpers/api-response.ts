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
 * Send a standardized error response: { success: false, error }
 */
export function sendError(res: Response, error: string, status = 500) {
  return res.status(status).json({ success: false, error })
}

/**
 * Send a standardized validation error response: { success: false, error, details }
 */
export function sendValidationError(res: Response, error: string, details: unknown[], status = 422) {
  return res.status(status).json({ success: false, error, details })
}
