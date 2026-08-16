import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getOAuthAccountModel } from '../../models/oauth-account.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin, enforceAdminTwoFactor } from './require-admin.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const deleteUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(deleteUserRegistry, router)

const deleteUserParamsSchema = z.object({
  id: z
    .string()
    .min(1, 'User ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .describe('MongoDB ObjectId of the user to delete'),
})

const deleteUserResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

const deleteUserController = async (req: Request, res: Response) => {
  try {
    const parsedParams = deleteUserParamsSchema.safeParse(req.params)
    if (!parsedParams.success) {
      return sendValidationError(res, 'Invalid parameters', parsedParams.error.issues)
    }

    const currentUser = req.user!
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin')

    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required', 403)
    }

    // Prevent self-deletion via admin endpoint
    if (parsedParams.data.id === currentUser._id) {
      return sendError(
        res,
        'Cannot delete your own account via admin endpoint. Use DELETE /auth/account instead.',
        400
      )
    }

    const AuthUser = await getAuthUserModel()
    const OAuthAccount = await getOAuthAccountModel()

    const user = await AuthUser.findById(parsedParams.data.id)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Prevent deleting another superadmin
    if (user.globalRoles?.includes('superadmin')) {
      return sendError(
        res,
        'Cannot delete a superadmin user. Only the user themselves can remove their superadmin status.',
        403
      )
    }

    // Cascade delete: OAuth accounts linked to this user
    await OAuthAccount.deleteMany({ userId: user._id })

    // Delete the user
    await AuthUser.findByIdAndDelete(parsedParams.data.id)

    logger.info(
      `Admin deleted user: ${user.email} (${parsedParams.data.id}) by ${currentUser.email}`
    )

    sendSuccess(res, { message: 'User deleted successfully' })
  } catch (error: unknown) {
    logger.error('Error deleting user:', error)
    sendError(res, 'Failed to delete user', 500)
  }
}

docRouter.delete(
  '/users/:id',
  verifyCookieCsrf,
  verifyTokenMiddleware,
  requireAdmin,
  enforceAdminTwoFactor,
  deleteUserController,
  {
    summary: 'Delete user (admin)',
    tags: ['Admin'],
    responseSchema: deleteUserResponseSchema,
    extraResponses: {
      400: { description: 'Bad request', schema: adminErrorSchema },
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      404: { description: 'User not found', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
