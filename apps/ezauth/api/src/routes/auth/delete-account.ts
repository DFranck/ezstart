import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createStrictRateLimiter,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getRefreshTokenModel } from '../../models/refresh-token.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'
import { requireEmailVerified } from '../../middleware/require-email-verified.js'
import { emailService } from '../../services/email.service.js'
import { accountDeletionTemplate } from '@ezstart/email-service'
import type { EmailContext } from '@ezstart/email-service'
import { AuditLogService } from '../../services/audit-log.service.js'
import { resolveUserLocale } from '../../utils/locale.js'
import { getAppDisplayName } from '../../utils/app-display.js'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieClearOptions,
  buildRefreshCookieClearOptions,
} from '../../config/cookie.js'

export const deleteAccountRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(deleteAccountRegistry, router)

/** Grace period (days) before the cron purges the soft-deleted account. */
const DELETION_GRACE_PERIOD_DAYS = 30

const deleteAccountBodySchema = z.object({
  /**
   * The user must echo their own email as a confirmation string. Anti-misclick
   * safety — the dialog asks them to type it. Comparison is case-insensitive
   * and trimmed to match the schema's normalization rules.
   */
  confirmation: z
    .string()
    .min(1)
    .max(254)
    .describe('Must equal the authenticated user email (case-insensitive).'),
  /**
   * Required when the user has set their own password — proves they still
   * control the account (mitigates same-day account-exfiltration after a
   * stolen-laptop scenario where the attacker has a live cookie/token but
   * not the password).
   */
  password: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe('Required when the user has set their own password.'),
})

const deleteAccountResponseSchema = z.object({
  message: z.string().describe('Human-readable confirmation.'),
  scheduledDeletionAt: z
    .string()
    .describe('ISO-8601 timestamp when the account will be permanently deleted.'),
  gracePeriodDays: z
    .number()
    .describe('Number of days the user has to cancel the deletion by signing back in.'),
})

/**
 * Helper that wipes the auth cookies the browser is holding for this
 * session. MUST mirror the options used at cookie creation (path, domain,
 * sameSite, secure) — otherwise the browser silently ignores the clear.
 *
 * Called both on successful soft-delete (so the now-revoked session can
 * no longer ride a stale cookie) and on the idempotent "already-deleted"
 * branch (in case the user retries from a tab that still has the cookie).
 */
function clearAuthCookies(req: Request, res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, buildAuthCookieClearOptions(req))
  res.clearCookie(REFRESH_COOKIE_NAME, buildRefreshCookieClearOptions(req))
}

/**
 * Soft-delete the authenticated user's account.
 *
 * - Verifies the email confirmation matches the user's email.
 * - Verifies the password when the user has set their own password.
 * - Marks the user as `deletedAt = now`, `scheduledHardDeleteAt = +30d`.
 * - Revokes all refresh tokens (forces logout across devices).
 * - Clears the access + refresh httpOnly cookies on the response so the
 *   current browser cannot keep replaying the (still unexpired) JWT.
 * - Marks any pending auth/verification codes as used.
 * - Writes a `session_revoked` audit log entry tagged with the deletion
 *   metadata (sessionRevoked + cookieCleared).
 * - Sends a goodbye email (fire-and-forget).
 */
const deleteAccountController = async (req: Request, res: Response) => {
  const userId = req.userId!

  const parsed = deleteAccountBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendValidationError(res, parsed.error)
  }

  const { confirmation, password } = parsed.data

  try {
    const AuthUser = await getAuthUserModel()
    // `includeDeleted: true` opt-out of the soft-delete pre-find guard so
    // we can detect and short-circuit the idempotent re-delete branch
    // below (a caller retrying the request after a successful soft-delete
    // must not get a 404).
    const user = await AuthUser.findById(userId, null, { includeDeleted: true })
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Already pending deletion — idempotent response with the existing schedule.
    // Still clear cookies in case the caller retried from a tab that kept the
    // pre-deletion session alive.
    if (user.deletedAt && user.scheduledHardDeleteAt) {
      clearAuthCookies(req, res)
      return sendSuccess(res, {
        message: 'Account already scheduled for deletion',
        scheduledDeletionAt: user.scheduledHardDeleteAt.toISOString(),
        gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
      })
    }

    // 1. Confirmation must match user.email (case-insensitive, trimmed).
    if (confirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
      return sendError(res, 'Confirmation does not match account email', 400, {
        code: 'CONFIRMATION_MISMATCH',
      })
    }

    // 2. Password verification when the user has set their own password.
    if (user.hasSetOwnPassword && user.passwordHash) {
      if (!password) {
        return sendError(res, 'Password is required to delete this account', 400, {
          code: 'PASSWORD_REQUIRED',
        })
      }
      const isValid = await user.comparePassword(password)
      if (!isValid) {
        return sendError(res, 'Incorrect password', 401, { code: 'INVALID_PASSWORD' })
      }
    }

    // 3. Mark as soft-deleted with grace period.
    const now = new Date()
    const scheduledHardDeleteAt = new Date(
      now.getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    )
    user.deletedAt = now
    user.scheduledHardDeleteAt = scheduledHardDeleteAt
    await user.save()

    // 4. Revoke all refresh tokens (forces logout across all devices).
    let revokedTokenCount = 0
    try {
      const RefreshToken = await getRefreshTokenModel()
      const result = await RefreshToken.updateMany(
        { userId: user._id, isRevoked: false },
        { $set: { isRevoked: true } }
      )
      revokedTokenCount = result.modifiedCount ?? 0
    } catch (err) {
      logger.warn('Failed to revoke refresh tokens during account deletion:', err)
    }

    // 5. Invalidate pending one-shot codes (verification, password reset, etc.).
    try {
      const AuthCode = await getAuthCodeModel()
      await AuthCode.updateMany(
        { userId: user._id.toString(), isUsed: false },
        { $set: { isUsed: true } }
      )
    } catch (err) {
      logger.warn('Failed to invalidate auth codes during account deletion:', err)
    }

    // 6. Clear access + refresh httpOnly cookies on this response so the
    //    browser drops the still-unexpired JWT (15 min TTL would otherwise
    //    keep `/api/auth/verify` returning 200 until natural expiry).
    clearAuthCookies(req, res)

    // 7. Audit log — record the session-revocation event with both the
    //    refresh-token revocation count and the cookie-clear flag so an
    //    operator can later prove the session was killed at delete-time.
    void AuditLogService.createFromRequest(req, {
      userId: user._id.toString(),
      action: 'session_revoked',
      metadata: {
        reason: 'account_deletion',
        sessionRevoked: true,
        cookieCleared: true,
        revokedTokenCount,
        scheduledHardDeleteAt: scheduledHardDeleteAt.toISOString(),
      },
    })

    // 8. Send goodbye email — fire-and-forget, non-blocking.
    //    Locale resolved from `Accept-Language` (no `locale` field on AuthUser
    //    yet — see BACKLOG). The first user-app is used as the brand context;
    //    falls back to the EZAuth display name when the user has no app.
    const locale = resolveUserLocale(req)
    const primaryAppKey = user.apps?.[0] ?? 'ezauth'
    const appDisplayName = getAppDisplayName(primaryAppKey)
    const ctx: EmailContext = {
      appName: appDisplayName,
      appKey: primaryAppKey,
      locale,
    }
    const rendered = accountDeletionTemplate(
      {
        username: user.username,
        email: user.email,
        scheduledHardDeleteAt,
        gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
      },
      ctx
    )

    void emailService
      .send({
        to: user.email,
        from: rendered.from ?? `${appDisplayName} <noreply@ezstart.xyz>`,
        ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
        subject: rendered.subject,
        html: rendered.html,
        ...(rendered.text ? { text: rendered.text } : {}),
      })
      .catch(err => {
        logger.warn('Failed to send goodbye email:', err)
      })

    logger.info(
      `Account scheduled for deletion: ${user.email} (${userId}), purge at ${scheduledHardDeleteAt.toISOString()}`
    )

    return sendSuccess(res, {
      message: 'Account scheduled for deletion',
      scheduledDeletionAt: scheduledHardDeleteAt.toISOString(),
      gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
    })
  } catch (error) {
    logger.error('Delete account error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to delete account', 500)
  }
}

docRouter.delete(
  '/account',
  createStrictRateLimiter(),
  verifyCookieCsrf,
  authMiddleware,
  // HAC-HIGH-2 (2026-05-17) — anti vandalism: an unverified account (the
  // signup victim never even consented) must not be able to wipe out
  // associated data through this endpoint. The legitimate "abandon
  // unverified signup" path is the cron purge or a deliberate admin
  // action, not a self-service delete from a stolen credential.
  // Cf. `standard-saas-security.md` §2.
  requireEmailVerified,
  deleteAccountController,
  {
    summary:
      'Schedule self-service account deletion. 30-day grace period; cancel by signing back in.',
    tags: ['User'],
    bodySchema: deleteAccountBodySchema,
    responseSchema: deleteAccountResponseSchema,
    extraResponses: {
      400: {
        description: 'Validation error or confirmation mismatch',
        schema: errorResponseSchema,
      },
      401: {
        description: 'Authentication required or invalid password',
        schema: errorResponseSchema,
      },
      403: {
        description: 'Email not verified — `code: EMAIL_VERIFICATION_REQUIRED`',
        schema: errorResponseSchema,
      },
      404: { description: 'User not found', schema: errorResponseSchema },
    },
  }
)

export default router
