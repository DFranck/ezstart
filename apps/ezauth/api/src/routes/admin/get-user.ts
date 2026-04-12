import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../../utils/map-to-record.js'
import { adminUserSchema, adminErrorSchema } from '../../types/admin-schemas.js'

export const getUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getUserRegistry, router)

const getUserResponseSchema = z.object({
  user: adminUserSchema.describe('User object'),
})

// Controller
const getUserController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(req.params.id).select('-passwordHash').lean()

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Check if admin has permission to view this user
    if (!currentUser.globalRoles?.includes('superadmin')) {
      if (user.globalRoles?.includes('superadmin')) {
        return sendError(res, 'Cannot view superadmin users', 403)
      }
      if (
        (currentUser.apps?.length ?? 0) > 0 &&
        !user.apps?.some((app: string) => currentUser.apps?.includes(app))
      ) {
        return sendError(res, 'User not in your apps', 403)
      }
    }

    sendSuccess(res, {
      user: {
        ...user,
        _id: user._id.toString(),
        globalRoles: user.globalRoles || [],
        appRoles: mapToRecord(user.appRoles as unknown as Map<string, string[]> | undefined),
        permissions: user.permissions || [],
        features: user.features || [],
      },
    })
  } catch (error: unknown) {
    logger.error('Error getting user:', error)
    sendError(res, 'Failed to get user', 500)
  }
}

docRouter.get('/users/:id', verifyTokenMiddleware, requireAdmin, getUserController, {
  summary: 'Get user by ID (admin)',
  tags: ['Admin'],
  responseSchema: getUserResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: adminErrorSchema },
    403: { description: 'Forbidden', schema: adminErrorSchema },
    404: { description: 'User not found', schema: adminErrorSchema },
    500: { description: 'Server error', schema: adminErrorSchema },
  },
})

export default router
