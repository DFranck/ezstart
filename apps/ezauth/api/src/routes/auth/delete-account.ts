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
import { emailService } from '../../services/email.service.js'

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
 * Soft-delete the authenticated user's account.
 *
 * - Verifies the email confirmation matches the user's email.
 * - Verifies the password when the user has set their own password.
 * - Marks the user as `deletedAt = now`, `scheduledHardDeleteAt = +30d`.
 * - Revokes all refresh tokens (forces logout across devices).
 * - Marks any pending auth/verification codes as used.
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
    const user = await AuthUser.findById(userId)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Already pending deletion — idempotent response with the existing schedule.
    if (user.deletedAt && user.scheduledHardDeleteAt) {
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
    try {
      const RefreshToken = await getRefreshTokenModel()
      await RefreshToken.updateMany(
        { userId: user._id, isRevoked: false },
        { $set: { isRevoked: true } }
      )
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

    // 6. Send goodbye email — fire-and-forget, non-blocking.
    void emailService
      .send({
        to: user.email,
        subject: 'Your EZAuth account is scheduled for deletion',
        html: buildGoodbyeEmailHtml({
          username: user.username,
          email: user.email,
          scheduledHardDeleteAt,
          gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
        }),
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

/**
 * Render the goodbye email body.
 *
 * @internal
 */
function buildGoodbyeEmailHtml(opts: {
  username: string
  email: string
  scheduledHardDeleteAt: Date
  gracePeriodDays: number
}): string {
  const formattedDate = opts.scheduledHardDeleteAt.toUTCString()
  return [
    `<p>Hi ${escapeHtml(opts.username)},</p>`,
    `<p>We received a request to delete your EZAuth account (<strong>${escapeHtml(
      opts.email
    )}</strong>).</p>`,
    `<p>Your account is now scheduled for permanent deletion on <strong>${formattedDate}</strong> (${opts.gracePeriodDays} days from now).</p>`,
    `<p>If you change your mind during this period, simply sign in again and your account will be restored.</p>`,
    `<p>If you didn't request this, please contact our support team immediately.</p>`,
    `<p>— The EZAuth team</p>`,
  ].join('\n')
}

/**
 * Minimal HTML escape for the email template — no DOM helpers in Node, and
 * we never want to reintroduce a stored-XSS vector via a username field.
 *
 * @internal
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

docRouter.delete(
  '/account',
  createStrictRateLimiter(),
  verifyCookieCsrf,
  authMiddleware,
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
      404: { description: 'User not found', schema: errorResponseSchema },
    },
  }
)

export default router
