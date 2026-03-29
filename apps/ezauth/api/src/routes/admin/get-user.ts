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
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const getUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getUserRegistry, router)

// Schemas
const userSchema = z.object({
  _id: z.string().describe('User unique identifier'),
  email: z.string().describe('User email address'),
  username: z.string().optional().describe('Username'),
  roles: z.array(z.string()).describe('User roles'),
  permissions: z.array(z.string()).describe('User permissions'),
  features: z.array(z.string()).describe('Enabled feature flags'),
  apps: z.array(z.string()).optional().describe('Accessible applications'),
  organizationId: z.string().optional().describe('Organization ID'),
  managedBy: z.string().optional().describe('Manager user ID'),
  createdAt: z.string().describe('Creation date ISO string'),
  updatedAt: z.string().describe('Last update date ISO string'),
})

const getUserResponseSchema = z.object({
  user: userSchema.describe('User object'),
})

const errorSchema = z.object({
  error: z.string().describe('Error message'),
  details: z.string().optional().describe('Additional error details'),
})

// Controller
const getUserController = async (req: any, res: any) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401)
    }

    const currentUser = req.user
    const isAdmin =
      currentUser.roles?.includes('admin') || currentUser.roles?.includes('superadmin')

    if (!isAdmin) {
      return sendError(res, 'Admin access required', 403)
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(req.params.id).select('-passwordHash').lean()

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Check if admin has permission to view this user
    if (!currentUser.roles?.includes('superadmin')) {
      if (user.roles?.includes('superadmin')) {
        return sendError(res, 'Cannot view superadmin users', 403)
      }
      if (
        currentUser.apps?.length > 0 &&
        !user.apps?.some((app: string) => currentUser.apps.includes(app))
      ) {
        return sendError(res, 'User not in your apps', 403)
      }
    }

    sendSuccess(res, {
      user: {
        ...user,
        _id: user._id.toString(),
        roles: user.roles || [],
        permissions: user.permissions || [],
        features: user.features || [],
      },
    })
  } catch (error: any) {
    logger.error('Error getting user:', error)
    sendError(res, 'Failed to get user', 500)
  }
}

docRouter.get('/users/:id', verifyTokenMiddleware, getUserController, {
  summary: 'Get user by ID (admin)',
  tags: ['Admin'],
  responseSchema: getUserResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: errorSchema },
    403: { description: 'Forbidden', schema: errorSchema },
    404: { description: 'User not found', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
