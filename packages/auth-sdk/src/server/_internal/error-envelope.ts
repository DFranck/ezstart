/**
 * Error envelope helper shared by the server-side auth middleware factories.
 *
 * Mirrors the `sendError` envelope shape emitted by `@ezstart/api-core`
 * (`{ success: false, error: { message, code?, details?, retryAfter? } }`)
 * without importing it, so the SDK stays agnostic. Extracted from
 * `auth-middleware.ts` / `api-key-middleware.ts` (Wave D Lot 4) — the two
 * factories had byte-identical copies; this is the single source.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/error-envelope
 */

import './server-only.js'

import type { Response } from 'express'

/**
 * Optional error metadata attached to the envelope. Each field is omitted
 * from the JSON body when `undefined` so the wire shape matches the legacy
 * per-app implementations exactly.
 */
export interface ErrorOptions {
  code?: string
  details?: unknown
  retryAfter?: number
}

/**
 * Write the standard `{ success: false, error }` envelope onto the response.
 * No-ops when headers were already sent (e.g. a previous error path already
 * responded), preserving the original guard behaviour.
 */
export function sendErrorEnvelope(
  res: Response,
  message: string,
  status: number,
  opts: ErrorOptions = {}
): void {
  const error: { message: string; code?: string; details?: unknown; retryAfter?: number } = {
    message,
  }
  if (opts.code !== undefined) error.code = opts.code
  if (opts.details !== undefined) error.details = opts.details
  if (opts.retryAfter !== undefined) error.retryAfter = opts.retryAfter
  if (!res.headersSent) {
    res.status(status).json({ success: false, error })
  }
}
