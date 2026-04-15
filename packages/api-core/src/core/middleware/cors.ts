/**
 * CORS middleware factory — thin wrapper over the `cors` package that
 * normalizes the two shapes we accept (`'*'` open policy or an explicit
 * origins array with `credentials: true`).
 */

import cors, { type CorsOptions } from 'cors'
import type { RequestHandler } from 'express'
import type { CorsConfig } from '../types.js'

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
const DEFAULT_HEADERS = ['Content-Type', 'Authorization', 'x-user-id']

/**
 * Build a CORS middleware from a `CorsConfig`.
 *
 * @example
 * ```ts
 * // Open policy (dev only)
 * app.use(createCorsMiddleware('*'))
 *
 * // Restricted with credentials
 * app.use(createCorsMiddleware({ origins: ['https://app.example.com'] }))
 * ```
 */
export function createCorsMiddleware(config: CorsConfig): RequestHandler {
  if (config === '*') {
    const opts: CorsOptions = {
      origin: '*',
      credentials: false,
      methods: DEFAULT_METHODS,
      allowedHeaders: DEFAULT_HEADERS,
    }
    return cors(opts)
  }

  const opts: CorsOptions = {
    origin: config.origins,
    credentials: config.credentials ?? true,
    methods: config.methods ?? DEFAULT_METHODS,
    allowedHeaders: config.allowedHeaders ?? DEFAULT_HEADERS,
  }
  return cors(opts)
}
