/**
 * Conditional CSRF guard.
 *
 * CSRF attacks only apply to cookie-authenticated requests (the browser
 * auto-sends the cookie on a cross-origin form POST). When the client
 * uses `Authorization: Bearer <token>`, it must have explicit JS access
 * to the token, so CSRF doesn't apply.
 *
 * This middleware runs the standard double-submit CSRF check ONLY when
 * the request is cookie-authenticated (no Authorization header but an
 * ezauth_token cookie is present). Bearer-auth requests pass through.
 *
 * Generating a CSRF token: clients call `GET /api/auth/login-cookie/csrf`
 * (existing endpoint) which sets the `csrf-token` cookie + `X-CSRF-Token`
 * response header. Subsequent state-changing requests must echo the token
 * via the `X-CSRF-Token` request header.
 */

import type { Request, Response, NextFunction } from 'express'
import { createCsrfMiddleware } from '@ezstart/express-core'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../config/cookie.js'

const standardCsrf = createCsrfMiddleware()

/**
 * Apply CSRF verification only when the request carries an ezauth auth
 * cookie (access OR refresh). Bearer-token requests skip — they require
 * explicit JS access to the token, so CSRF doesn't apply. Unauthenticated
 * requests also pass through; downstream auth middleware handles rejection.
 */
export function verifyCookieCsrf(req: Request, res: Response, next: NextFunction) {
  // Bearer auth — not a CSRF vector
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  const hasAuthCookie = Boolean(
    req.cookies?.[ACCESS_COOKIE_NAME] || req.cookies?.[REFRESH_COOKIE_NAME]
  )
  if (!hasAuthCookie) {
    return next()
  }

  return standardCsrf.verifyToken(req, res, next)
}

export const csrfHelpers = standardCsrf
