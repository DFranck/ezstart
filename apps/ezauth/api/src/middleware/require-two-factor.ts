/**
 * 2FA mandatory enforcement middleware for elevated-role users.
 *
 * Defense-in-depth security gate (cf. `standard-saas-security.md` §2 — "2FA
 * mandatory pour admin / superadmin"). Without 2FA an admin token compromise
 * = full platform breach. Industry pattern (Stripe / Clerk / Auth0 all
 * enforce admin 2FA).
 *
 * Chains AFTER `verifyTokenMiddleware` so `req.user` is populated. Looks up
 * the user's 2FA enrollment status live (via `TotpService.isEnabled`) so a
 * superadmin who just disabled 2FA is locked out on the next request — the
 * JWT `twoFactorEnabled` claim is informational for SDK consumers but is NOT
 * the security source of truth here.
 *
 * Failure mode :
 * - 401 when upstream auth never populated `req.user` (programmer error).
 * - 403 + `code: 'TWO_FACTOR_REQUIRED'` + `details: { redirectTo }` when the
 *   user holds an elevated role but has no enrolled TOTP.
 * - `next()` for plain users (skip — middleware is a no-op for non-admins so
 *   the same router can host both elevated and non-elevated routes if ever
 *   needed in the future).
 */

import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { TotpService } from '../services/totp.service.js'

/**
 * Machine-readable error code returned when an elevated-role user accesses
 * a protected route without 2FA enrolled. Exported so SDK consumers can
 * match on the constant rather than the string literal.
 */
export const TWO_FACTOR_REQUIRED_CODE = 'TWO_FACTOR_REQUIRED'

/** Default UI route the SDK guard / API consumer redirects to. */
const DEFAULT_REDIRECT_TO = '/settings?tab=2fa'

/** Roles that trigger the 2FA requirement (any match → enforced). */
const ELEVATED_ROLES = new Set<string>(['admin', 'superadmin'])

function userHasElevatedRole(user: {
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
}): boolean {
  if (user.globalRoles?.some(r => ELEVATED_ROLES.has(r))) return true

  const appRoles = user.appRoles
  if (appRoles && typeof appRoles === 'object') {
    for (const roles of Object.values(appRoles)) {
      if (Array.isArray(roles) && roles.some(r => ELEVATED_ROLES.has(r))) return true
    }
  }
  return false
}

/**
 * Express middleware factory enforcing 2FA enrollment for users with
 * elevated roles (admin / superadmin, global or per-app).
 *
 * @example
 * ```ts
 * router.use(verifyTokenMiddleware)
 * router.use(requireAdmin)
 * router.use(requireTwoFactor())
 * ```
 */
export function requireTwoFactor() {
  return async function requireTwoFactorMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = req.user
    if (!user) {
      // Defensive — `verifyTokenMiddleware` should have rejected already.
      sendError(res, 'Authentication required', 401, { code: 'UNAUTHORIZED' })
      return
    }

    // Skip when the request authenticated via an admin API key. The key
    // itself is a possession factor (Stripe-pattern: `sk_live_*` keys are
    // never asked for an additional 2FA challenge — they're already a
    // second factor and cannot prompt a TOTP code in a S2S context).
    if (typeof req.apiKeyId === 'string' && req.apiKeyId.length > 0) {
      next()
      return
    }

    if (!userHasElevatedRole(user)) {
      next()
      return
    }

    const userId = user._id ?? user.userId
    if (typeof userId !== 'string' || userId.length === 0) {
      // Defensive — should never happen if upstream populated req.user.
      sendError(res, 'Authentication required', 401, { code: 'UNAUTHORIZED' })
      return
    }

    let enrolled: boolean
    try {
      enrolled = await TotpService.isEnabled(userId)
    } catch (error: unknown) {
      // Mongo hiccup — fail closed for an admin route. The user can retry,
      // and Sentry / Better Stack will surface the underlying error so the
      // operator can investigate. Returning 500 here is intentional: silently
      // letting the request through would weaken the gate.
      logger.error(
        { err: error, userId, path: req.path },
        '2FA enforcement check failed — denying request'
      )
      sendError(res, '2FA enforcement check failed', 500, { code: 'TWO_FACTOR_CHECK_FAILED' })
      return
    }

    if (!enrolled) {
      logger.warn(
        {
          userId,
          email: user.email,
          path: req.path,
          method: req.method,
          globalRoles: user.globalRoles,
          appRoles: user.appRoles,
        },
        'Admin user blocked: 2FA not enrolled'
      )
      sendError(res, 'Admin accounts must have 2FA enabled', 403, {
        code: TWO_FACTOR_REQUIRED_CODE,
        details: { redirectTo: DEFAULT_REDIRECT_TO },
      })
      return
    }

    next()
  }
}
