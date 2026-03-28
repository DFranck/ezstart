import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
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
  updatedAt: z.string().describe('Last update date ISO string')
})

const getUserResponseSchema = z.object({
  user: userSchema.describe('User object')
})

const errorSchema = z.object({
  error: z.string().describe('Error message'),
  details: z.string().optional().describe('Additional error details')
})

// Controller
const getUserController = async (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const currentUser = req.user
    const isAdmin = currentUser.roles?.includes('admin') || currentUser.roles?.includes('superadmin')

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(req.params.id).select('-passwordHash').lean()

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if admin has permission to view this user
    if (!currentUser.roles?.includes('superadmin')) {
      if (user.roles?.includes('superadmin')) {
        return res.status(403).json({ error: 'Cannot view superadmin users' })
      }
      if (currentUser.apps?.length > 0 && !user.apps?.some((app: string) => currentUser.apps.includes(app))) {
        return res.status(403).json({ error: 'User not in your apps' })
      }
    }

    res.json({
      user: {
        ...user,
        _id: user._id.toString(),
        roles: user.roles || [],
        permissions: user.permissions || [],
        features: user.features || []
      }
    })
  } catch (error: any) {
    logger.error('Error getting user:', error)
    res.status(500).json({
      error: 'Failed to get user',
      details: error.message
    })
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
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router
