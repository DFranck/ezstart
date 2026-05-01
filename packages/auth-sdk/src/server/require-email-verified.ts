/**
 * Express middleware enforcing that the authenticated user has verified
 * their email address before accessing the protected route.
 *
 * Composable, opt-in gate (Clerk / Vercel pattern) — login itself stays
 * open and consumers selectively gate critical features behind email
 * verification.
 *
 * Chain AFTER an upstream auth middleware that hydrates `req.user`
 * (`verifyTokenMiddleware` in EZAuth, `rbacRequireAuth` from this SDK,
 * any equivalent in third-party apps).
 *
 * @example
 * ```ts
 * import { requireEmailVerified } from '@ezstart/auth-sdk/server'
 *
 * router.post(
 *   '/payments/refund',
 *   verifyTokenMiddleware,
 *   requireEmailVerified,
 *   refundController,
 * )
 * ```
 *
 * Failure mode :
 * - 401 when no upstream middleware populated `req.user` (programmer error)
 * - 403 + machine-readable `code: 'EMAIL_VERIFICATION_REQUIRED'` when the
 *   account exists but the email is not verified, so SDK consumers can
 *   surface the dedicated `<EmailVerificationBanner>` /
 *   `<RequireEmailVerified>` UI affordances.
 */

import 'server-only'

import type { Request, Response, NextFunction } from 'express'

/**
 * The HTTP error code returned by `requireEmailVerified` when the
 * authenticated user has not verified their email. Exported so client
 * code can match on a constant rather than a hard-coded string.
 */
export const EMAIL_VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED'

function sendErrorResponse(res: Response, status: number, message: string, code?: string): void {
  const error: { message: string; code?: string } = { message }
  if (code !== undefined) error.code = code
  res.status(status).json({ success: false, error })
}

/**
 * Gate that requires `req.user.isVerified === true`.
 *
 * - 401 when no upstream auth middleware populated `req.user`
 * - 403 + `code: 'EMAIL_VERIFICATION_REQUIRED'` when the account exists
 *   but the email is not verified
 * - `next()` otherwise
 *
 * Self-contained — does not depend on `@ezstart/api-core` so the SDK
 * stays lean for third-party consumers that ship their own response
 * helpers.
 */
export function requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
  const user = req.user
  if (!user) {
    sendErrorResponse(res, 401, 'Authentication required')
    return
  }

  // `isVerified` is hydrated by upstream auth from `auth_users.isVerified`.
  // Treat any non-`true` value as un-verified (defensive for legacy /
  // partially-hydrated documents).
  if (user.isVerified !== true) {
    sendErrorResponse(res, 403, 'Email verification required', EMAIL_VERIFICATION_REQUIRED_CODE)
    return
  }

  next()
}
