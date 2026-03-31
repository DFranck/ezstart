import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createAuthMiddleware,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getOAuthAccountModel } from '../../models/oauth-account.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'

const { authMiddleware } = createAuthMiddleware()

export const deleteAccountRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(deleteAccountRegistry, router)

const deleteAccountResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

const deleteAccountController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    const AuthUser = await getAuthUserModel()
    const OAuthAccount = await getOAuthAccountModel()

    const user = await AuthUser.findById(userId)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Cascade delete: OAuth accounts linked to this user
    await OAuthAccount.deleteMany({ userId: user._id })

    // Delete the user
    await AuthUser.findByIdAndDelete(userId)

    logger.info(`Account deleted: ${user.email} (${userId})`)

    sendSuccess(res, { message: 'Account deleted successfully' })
  } catch (error) {
    logger.error('Delete account error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to delete account', 500)
  }
}

docRouter.delete('/account', authMiddleware, deleteAccountController, {
  summary: 'Delete own account (self-service)',
  tags: ['User'],
  responseSchema: deleteAccountResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'User not found', schema: errorResponseSchema },
  },
})

export default router
