import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getOAuthAccountModel } from '../../models/oauth-account.js'
import { getRefreshTokenModel } from '../../models/refresh-token.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'

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
    const RefreshToken = await getRefreshTokenModel()

    const user = await AuthUser.findById(userId)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Cascade delete: OAuth accounts and refresh tokens linked to this user
    await OAuthAccount.deleteMany({ userId: user._id })
    await RefreshToken.deleteMany({ userId: user._id })

    // Delete the user
    await AuthUser.findByIdAndDelete(userId)

    logger.info(`Account deleted: ${user.email} (${userId})`)

    sendSuccess(res, { message: 'Account deleted successfully' })
  } catch (error) {
    logger.error('Delete account error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to delete account', 500)
  }
}

docRouter.delete('/account', verifyCookieCsrf, authMiddleware, deleteAccountController, {
  summary: 'Delete own account (self-service)',
  tags: ['User'],
  responseSchema: deleteAccountResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'User not found', schema: errorResponseSchema },
  },
})

export default router
