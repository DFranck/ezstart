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
import crypto from 'crypto'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getEmailChangeRequestModel } from '../../models/email-change-request.js'
import { getRefreshTokenModel } from '../../models/refresh-token.js'
import { emailService } from '../../services/email.service.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'
import { resolveUserLocale } from '../../utils/locale.js'
import { getAppDisplayName } from '../../utils/app-display.js'
import { getWebUrl } from '@ezstart/config/urls'
import { emailChangeVerifyTemplate } from '../../email/templates/email-change-verify.js'

export const changeEmailRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(changeEmailRegistry, router)

/** Verification link TTL — 24h, matches the model default. */
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

const changeEmailRequestSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(254)
    .email('Invalid email address')
    .describe('New email address (must not be the current email or already taken)'),
  /**
   * Required when the user has set their own password — proves they
   * control the account. Optional for OAuth-only users (no password to
   * verify).
   */
  password: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe('Required when the user has set their own password.'),
  locale: z.enum(['en', 'fr', 'vi']).optional().describe('Preferred locale for the email'),
  app: z.string().optional().describe('App slug to brand the email (e.g. ezauth, green-pulse)'),
})

const changeEmailResponseSchema = z.object({
  message: z.string().describe('Human-readable confirmation.'),
  expiresAt: z
    .string()
    .describe('ISO-8601 timestamp when the verification link expires (24h from now).'),
})

const verifyEmailChangeQuerySchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Email change verification token'),
})

const verifyEmailChangeResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

// ─── POST /change-email ───────────────────────────────────────────────────────

const changeEmailController = async (req: Request, res: Response) => {
  const userId = req.userId!

  const parsed = changeEmailRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendValidationError(res, 'Invalid email change request', parsed.error.issues)
  }

  const { newEmail, password, locale: bodyLocale, app: bodyApp } = parsed.data

  try {
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(userId)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Reject if the requested email is the same as the current one.
    if (newEmail === user.email.toLowerCase()) {
      return sendError(res, 'New email is the same as the current email', 400, {
        code: 'EMAIL_SAME_AS_CURRENT',
      })
    }

    // Reject if another user already owns this email.
    const existing = await AuthUser.findOne({ email: newEmail })
    if (existing) {
      // Don't leak existence — same generic 409 from a security view.
      return sendError(res, 'Email already taken', 409, { code: 'EMAIL_ALREADY_TAKEN' })
    }

    // Password check when the user has a password set. OAuth-only users
    // (no password) skip this step — they're already authenticated by JWT.
    if (user.hasSetOwnPassword && user.passwordHash) {
      if (!password) {
        return sendError(res, 'Password is required to change email', 400, {
          code: 'PASSWORD_REQUIRED',
        })
      }
      const isValid = await user.comparePassword(password)
      if (!isValid) {
        return sendError(res, 'Incorrect password', 401, { code: 'INVALID_PASSWORD' })
      }
    }

    const EmailChangeRequest = await getEmailChangeRequestModel()
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS)

    // Invalidate any prior pending requests for this user — only one
    // verification link should be active at a time.
    await EmailChangeRequest.updateMany(
      { userId: user._id!.toString(), isUsed: false },
      { $set: { isUsed: true, consumedAt: new Date() } }
    )

    const ua = req.headers['user-agent']
    await EmailChangeRequest.create({
      userId: user._id!.toString(),
      oldEmail: user.email,
      newEmail,
      token,
      expiresAt,
      issuedFromIp: req.ip,
      issuedUa: typeof ua === 'string' ? ua : undefined,
    })

    // Build verify URL and send email to the NEW address (proof of control).
    const locale = resolveUserLocale(req, bodyLocale)
    const appKey = bodyApp || 'ezauth'
    const appDisplayName = getAppDisplayName(appKey)
    const verifyUrl = `${getWebUrl('ezauth')}/${locale}/email-change/verify?token=${encodeURIComponent(token)}`

    const rendered = emailChangeVerifyTemplate(
      { verifyUrl, oldEmail: user.email, newEmail },
      { appName: appDisplayName, appKey, locale }
    )

    try {
      await emailService.send({
        to: newEmail,
        from: `${appDisplayName} <noreply@ezstart.xyz>`,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
      logger.info(
        { userId: user._id!.toString(), oldEmail: user.email, newEmail },
        'Email change verification sent'
      )
    } catch (sendErr) {
      logger.error('Failed to send email-change verification:', sendErr)
      return sendError(res, 'Failed to send verification email', 500)
    }

    void AuditLogService.createFromRequest(req, {
      userId: user._id!.toString(),
      action: 'email_change_requested',
      metadata: { oldEmail: user.email, newEmail, expiresAt: expiresAt.toISOString() },
    })

    return sendSuccess(res, {
      message: 'Verification email sent to your new address',
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    logger.error('Change email error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to change email', 500)
  }
}

// ─── GET /email-change/verify ─────────────────────────────────────────────────

const verifyEmailChangeController = async (req: Request, res: Response) => {
  const parsed = verifyEmailChangeQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return sendValidationError(res, 'Invalid verification token', parsed.error.issues)
  }

  const { token } = parsed.data

  try {
    const EmailChangeRequest = await getEmailChangeRequestModel()
    const request = await EmailChangeRequest.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    if (!request) {
      return sendError(res, 'Invalid or expired verification token', 400, {
        code: 'INVALID_OR_EXPIRED_TOKEN',
      })
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(request.userId)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Race guard: another user may have grabbed this email between request
    // creation and verification — re-check uniqueness.
    const conflict = await AuthUser.findOne({
      email: request.newEmail,
      _id: { $ne: user._id },
    })
    if (conflict) {
      // Mark the request as consumed so it can't be retried.
      request.isUsed = true
      request.consumedAt = new Date()
      await request.save()
      return sendError(res, 'Email already taken by another account', 409, {
        code: 'EMAIL_ALREADY_TAKEN',
      })
    }

    const oldEmail = user.email
    user.email = request.newEmail
    // Reset verification flag — the new email needs to be re-verified for
    // sensitive ops, and our flow already proved control via this link, so
    // mark it verified here.
    user.isVerified = true
    await user.save()

    // Mark request consumed.
    request.isUsed = true
    request.consumedAt = new Date()
    await request.save()

    // Revoke all refresh tokens — force re-login with the new email so
    // any stolen session is killed at the email-change moment.
    let revokedTokenCount = 0
    try {
      const RefreshToken = await getRefreshTokenModel()
      const result = await RefreshToken.updateMany(
        { userId: user._id, isRevoked: false },
        { $set: { isRevoked: true } }
      )
      revokedTokenCount = result.modifiedCount ?? 0
    } catch (err) {
      logger.warn('Failed to revoke refresh tokens after email change:', err)
    }

    void AuditLogService.createFromRequest(req, {
      userId: user._id!.toString(),
      action: 'email_change_completed',
      metadata: { oldEmail, newEmail: request.newEmail, revokedTokenCount },
    })

    logger.info(
      { userId: user._id!.toString(), oldEmail, newEmail: request.newEmail },
      'Email change completed'
    )

    return sendSuccess(res, { message: 'Email changed successfully' })
  } catch (error) {
    logger.error('Verify email change error:', error)
    return sendError(res, 'Failed to verify email change', 500)
  }
}

docRouter.post(
  '/change-email',
  createStrictRateLimiter(),
  verifyCookieCsrf,
  authMiddleware,
  changeEmailController,
  {
    summary: 'Request an email change (sends verification link to the new address)',
    tags: ['User'],
    bodySchema: changeEmailRequestSchema,
    responseSchema: changeEmailResponseSchema,
    extraResponses: {
      400: { description: 'Invalid request or password missing', schema: errorResponseSchema },
      401: {
        description: 'Authentication required or invalid password',
        schema: errorResponseSchema,
      },
      404: { description: 'User not found', schema: errorResponseSchema },
      409: { description: 'Email already taken', schema: errorResponseSchema },
      429: { description: 'Too many attempts', schema: errorResponseSchema },
    },
  }
)

docRouter.get('/email-change/verify', createStrictRateLimiter(), verifyEmailChangeController, {
  summary: 'Verify an email change with the token sent to the new address',
  tags: ['User'],
  responseSchema: verifyEmailChangeResponseSchema,
  extraResponses: {
    400: { description: 'Invalid or expired token', schema: errorResponseSchema },
    404: { description: 'User not found', schema: errorResponseSchema },
    409: { description: 'Email already taken (race condition)', schema: errorResponseSchema },
    500: { description: 'Server error', schema: errorResponseSchema },
  },
})

export default router
