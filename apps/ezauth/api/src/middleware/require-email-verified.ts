/**
 * Express middleware enforcing that the authenticated user has verified their
 * email address before accessing the protected route.
 *
 * Composable, opt-in gate (Clerk / Vercel pattern) — login itself stays open
 * and consumers selectively gate critical features behind email verification.
 *
 * Chain AFTER `verifyTokenMiddleware` so `req.user` is populated.
 *
 * @example
 * ```ts
 * router.post(
 *   '/api/payments/refund',
 *   verifyTokenMiddleware,
 *   requireEmailVerified,
 *   refundController,
 * )
 * ```
 *
 * Failure mode : returns 403 with code `EMAIL_VERIFICATION_REQUIRED` so SDK
 * consumers can surface the dedicated `<EmailVerificationBanner>` /
 * `<RequireEmailVerified>` UI affordances.
 *
 * Implementation lives in `@ezstart/auth-sdk/server` so the same gate is
 * reusable by every consumer API (ezpay, etc.) without duplication.
 */

export { requireEmailVerified, EMAIL_VERIFICATION_REQUIRED_CODE } from '@ezstart/auth-sdk/server'
