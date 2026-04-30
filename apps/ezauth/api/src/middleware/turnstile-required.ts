/**
 * Express middleware enforcing a successful Cloudflare Turnstile challenge
 * via `req.body.turnstileToken`.
 *
 * No-op when `TURNSTILE_SECRET_KEY` env is unset — `verifyTurnstileToken`
 * returns `{ success: true }` so the request flows through unchanged.
 * This lets us mount the middleware on auth routes today and enable
 * the captcha later by setting the env var, with zero application changes.
 *
 * Chain BEFORE the actual route controller. Returns HTTP 400
 * (`VALIDATION_ERROR`) when the token is missing or invalid so the SDK
 * can surface a generic "Captcha verification failed" error.
 *
 * @example
 * ```ts
 * router.post('/register', registerRateLimiter, requireTurnstile(), registerController)
 * ```
 */

import type { Request, Response, NextFunction } from 'express'
import { sendValidationError } from '@ezstart/api-core'
import { verifyTurnstileToken } from '../services/turnstile.service.js'

/**
 * Factory returning the middleware so callers can adapt configuration
 * later (e.g. per-route quota, custom error code) without breaking the
 * call site signature.
 */
export function requireTurnstile() {
  return async function turnstileGate(req: Request, res: Response, next: NextFunction) {
    const body = (req.body ?? {}) as { turnstileToken?: unknown }
    const token = typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined
    const result = await verifyTurnstileToken(token, req.ip)
    if (!result.success) {
      return sendValidationError(res, 'Captcha verification failed', result.errorCodes ?? [], 400)
    }
    return next()
  }
}
