import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { z } from 'zod'

export const updateUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateUserRegistry, router)

// Schemas
const updateUserRequestSchema = z.object({
  roles: z.array(z.enum(['superadmin', 'admin', 'manager', 'beta-tester', 'client'])).optional(),
  permissions: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  apps: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  managedBy: z.string().optional()
})

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

const updateUserResponseSchema = z.object({
  user: userSchema,
  message: z.string()
})

const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

// Controller
const updateUserController = async (req: any, res: any) => {
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
    const user = await AuthUser.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if admin has permission to modify this user
    if (!currentUser.roles?.includes('superadmin')) {
      if (user.roles?.includes('superadmin')) {
        return res.status(403).json({ error: 'Cannot modify superadmin users' })
      }
      if (req.body.roles?.includes('superadmin')) {
        return res.status(403).json({ error: 'Cannot assign superadmin role' })
      }
      if (currentUser.apps?.length > 0 && !user.apps?.some((app: string) => currentUser.apps.includes(app))) {
        return res.status(403).json({ error: 'User not in your apps' })
      }
    }

    // Update fields
    const allowedFields = ['roles', 'permissions', 'features', 'apps', 'organizationId', 'managedBy']
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (user as any)[field] = req.body[field]
      }
    })

    await user.save()

    res.json({
      user: {
        ...user.toObject(),
        _id: user._id.toString(),
        roles: user.roles || [],
        permissions: user.permissions || [],
        features: user.features || []
      },
      message: 'User updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message
    })
  }
}

docRouter.patch('/users/:id', verifyTokenMiddleware, updateUserController, {
  summary: 'Update user (admin)',
  tags: ['Admin'],
  bodySchema: updateUserRequestSchema,
  responseSchema: updateUserResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: errorSchema },
    403: { description: 'Forbidden', schema: errorSchema },
    404: { description: 'User not found', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router
