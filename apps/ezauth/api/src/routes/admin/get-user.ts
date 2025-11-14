import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { z } from 'zod'

export const getUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getUserRegistry, router)

// Schemas
const userSchema = z.object({
  _id: z.string(),
  email: z.string(),
  username: z.string().optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  features: z.array(z.string()),
  apps: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  managedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const getUserResponseSchema = z.object({
  user: userSchema
})

const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional()
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
    console.error('Error getting user:', error)
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
