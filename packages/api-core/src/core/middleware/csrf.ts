/**
 * CSRF protection middleware factory.
 *
 * Generates a random token stored in a non-httpOnly cookie and echoed in
 * a response header. Mutating requests (POST, PUT, PATCH, DELETE) must
 * send the token back via the `X-CSRF-Token` header — mismatches are
 * rejected with `403`.
 */

import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../responses.js'

/**
 * Build a pair of CSRF middlewares:
 * - `generateToken` — sets a `csrf-token` cookie + `X-CSRF-Token` header.
 * - `verifyToken` — validates the cookie/header pair on mutating methods.
 *
 * @example
 * ```ts
 * import { createCsrfMiddleware } from '@ezstart/api-core'
 *
 * const csrf = createCsrfMiddleware()
 * app.use(csrf.generateToken)
 * app.use(csrf.verifyToken)
 * ```
 */
export function createCsrfMiddleware() {
  return {
    generateToken: (req: Request, res: Response, next: NextFunction) => {
      const token = crypto.randomBytes(32).toString('hex')
      res.cookie('csrf-token', token, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
      res.setHeader('X-CSRF-Token', token)
      next()
    },
    verifyToken: (req: Request, res: Response, next: NextFunction) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
      const cookieToken = req.cookies?.['csrf-token'] as string | undefined
      const headerToken = req.headers['x-csrf-token'] as string | undefined
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return sendError(res, 'CSRF token mismatch', 403)
      }
      next()
    },
  }
}
