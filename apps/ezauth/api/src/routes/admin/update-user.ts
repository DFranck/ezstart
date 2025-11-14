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
  // New role structure
  globalRoles: z.array(z.enum(['superadmin'])).optional(),
  appRoles: z.record(z.string(), z.array(z.enum(['admin', 'manager', 'beta-tester', 'client']))).optional(),
  // Legacy fields
  roles: z.array(z.enum(['superadmin', 'admin', 'manager', 'beta-tester', 'client'])).optional(),
  permissions: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  apps: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
  organizationId: z.string().optional(),
  managedBy: z.string().optional()
})

const userSchema = z.object({
  _id: z.string(),
  email: z.string(),
  username: z.string().optional(),
  globalRoles: z.array(z.string()).optional(),
  appRoles: z.record(z.string(), z.array(z.string())).optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  features: z.array(z.string()),
  apps: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
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
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin') || currentUser.roles?.includes('superadmin')

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Superadmin access required for user management from ezstart' })
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update globalRoles (only superadmin can do this)
    if (req.body.globalRoles !== undefined) {
      user.globalRoles = req.body.globalRoles
    }

    // Update appRoles
    if (req.body.appRoles !== undefined) {
      // Convert plain object to Map
      const appRolesMap = new Map<string, string[]>()
      Object.entries(req.body.appRoles).forEach(([app, roles]) => {
        appRolesMap.set(app, roles as string[])
      })
      user.appRoles = appRolesMap
    }

    // Update other fields
    const allowedFields = ['roles', 'permissions', 'features', 'apps', 'isVerified', 'organizationId', 'managedBy']
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (user as any)[field] = req.body[field]
      }
    })

    await user.save()

    // Convert appRoles Map to object for response
    const appRolesObj: Record<string, string[]> = {}
    if (user.appRoles) {
      user.appRoles.forEach((roles: string[], appName: string) => {
        appRolesObj[appName] = roles
      })
    }

    res.json({
      user: {
        ...user.toObject(),
        _id: (user._id as any).toString(),
        globalRoles: user.globalRoles || [],
        appRoles: appRolesObj,
        roles: user.roles || [],
        permissions: user.permissions || [],
        features: user.features || [],
        isVerified: user.isVerified
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
