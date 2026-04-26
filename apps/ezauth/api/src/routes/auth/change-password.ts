import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
  createStrictRateLimiter,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'

export const changePasswordRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(changePasswordRegistry, router)

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .optional()
    .describe('Current password (not required for OAuth-only users)'),
  newPassword: z.string().min(8).max(128).describe('New password (min 8, max 128 chars)'),
})

const changePasswordController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const parsed = changePasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid password data', parsed.error.issues)
    }

    const { currentPassword, newPassword } = parsed.data
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(userId)

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // If user has a password, verify current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return sendError(res, 'Current password is required', 400)
      }
      const isValid = await user.comparePassword(currentPassword)
      if (!isValid) {
        return sendError(res, 'Current password is incorrect', 401)
      }
    }
    // If user has no password (OAuth-only), allow setting one without currentPassword

    // Set new password — pre-save hook will hash it automatically
    user.passwordHash = newPassword
    user.hasSetOwnPassword = true
    await user.save()

    // Invalidate any pending password-reset tokens for this user
    try {
      const AuthCodeModel = await getAuthCodeModel()
      await AuthCodeModel.updateMany(
        { userId, type: 'password-reset', isUsed: false },
        { $set: { isUsed: true } }
      )
    } catch (err) {
      logger.warn('Failed to invalidate reset tokens after password change:', err)
    }

    logger.info(`Password changed for user ${userId}`)
    void AuditLogService.createFromRequest(req, {
      userId,
      action: 'password_change',
    })
    sendSuccess(res, { message: 'Password changed successfully' })
  } catch (error) {
    logger.error('Change password error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to change password', 500)
  }
}

docRouter.put(
  '/change-password',
  createStrictRateLimiter(),
  verifyCookieCsrf,
  authMiddleware,
  changePasswordController,
  {
    summary: 'Change own password (or create password for OAuth users)',
    tags: ['User'],
    bodySchema: changePasswordSchema,
    extraResponses: {
      400: { description: 'Current password required', schema: errorResponseSchema },
      401: { description: 'Current password incorrect', schema: errorResponseSchema },
      404: { description: 'User not found', schema: errorResponseSchema },
    },
  }
)

export default router
