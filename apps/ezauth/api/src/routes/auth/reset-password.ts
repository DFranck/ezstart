import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { ResetPasswordRequestSchema } from '@ezstart/api-contracts'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { logger } from '@ezstart/logger/server'
import {
  assertPasswordStrength,
  WeakPasswordError,
  PwnedPasswordError,
} from '../../services/password-policy.service.js'

export const resetPasswordRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(resetPasswordRegistry, router)

const resetPasswordRateLimiter = createStrictRateLimiter()

// HAC-HIGH-5 / Wave D Lot 2.5 (2026-05-17) — import canonical
// `ResetPasswordRequestSchema` from `@ezstart/api-contracts` (single source
// of truth). Previously this route inlined `newPassword: min(8)`, which let
// forgot-password → reset-password bypass the 12-char floor enforced by
// `RegisterRequestSchema` / `changePasswordSchema`. See
// `standard-saas-security.md` §2 ("password strength enforcement").
const resetPasswordSchema = ResetPasswordRequestSchema

const resetPasswordResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
})

const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request', parsed.error.issues)
    }

    const { token, newPassword } = parsed.data
    const AuthCodeModel = await getAuthCodeModel()

    // Find valid password reset token
    const authCode = await AuthCodeModel.findOne({
      code: token,
      type: 'password-reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    if (!authCode) {
      return sendError(res, 'Invalid or expired reset token', 400, {
        code: 'INVALID_OR_EXPIRED_TOKEN',
      })
    }

    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(authCode.userId)

    if (!user) {
      return sendError(res, 'Invalid or expired reset token', 400, {
        code: 'INVALID_OR_EXPIRED_TOKEN',
      })
    }

    // MED-1 — enforce password strength (zxcvbn + HIBP) BEFORE hashing/saving.
    // Penalize passwords derived from the account identity. A failure here
    // returns 422 with a stable code and does NOT consume the reset token, so
    // the user can retry with a stronger password using the same link.
    await assertPasswordStrength(newPassword, [user.email, user.username])

    // Update password (pre-save hook will hash it)
    user.passwordHash = newPassword
    user.hasSetOwnPassword = true
    await user.save()

    // Invalidate ALL pending password-reset tokens for this user (not just the one used).
    // Prevents a second valid token from being reused after a successful reset.
    await AuthCodeModel.updateMany(
      { userId: authCode.userId, type: 'password-reset', isUsed: false },
      { $set: { isUsed: true } }
    )

    logger.info({ userId: user._id!.toString() }, 'Password reset successfully')

    sendSuccess(res, { message: 'Password reset successfully' })
  } catch (error) {
    // MED-1 / MED-3 — surface the password-policy rejection with a stable,
    // non-leaking code (422). Everything else returns a generic 500 message
    // (no `error.message` leak).
    if (error instanceof WeakPasswordError || error instanceof PwnedPasswordError) {
      return sendError(res, error.message, error.statusCode, { code: error.code })
    }
    logger.error('Reset password error:', error)
    sendError(res, 'Failed to reset password', 500)
  }
}

docRouter.post('/reset-password', resetPasswordRateLimiter, resetPasswordController, {
  summary: 'Reset password with token',
  tags: ['Authentication'],
  bodySchema: resetPasswordSchema,
  responseSchema: resetPasswordResponseSchema,
  extraResponses: {
    400: { description: 'Invalid or expired token', schema: errorSchema },
    422: {
      description: 'Password too weak (`WEAK_PASSWORD`) or breached (`PWNED_PASSWORD`)',
      schema: errorSchema,
    },
    429: { description: 'Too many attempts', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
