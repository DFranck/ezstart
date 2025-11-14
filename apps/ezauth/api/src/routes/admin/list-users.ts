import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { z } from 'zod'

export const listUsersRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listUsersRegistry, router)

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

const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
})

const listUsersResponseSchema = z.object({
  users: z.array(userSchema),
  pagination: paginationSchema
})

const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

// Controller
const listUsersController = async (req: any, res: any) => {
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
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50

    const query: any = {}

    // Superadmin sees all users, admin sees non-superadmins in their apps
    if (!currentUser.roles?.includes('superadmin')) {
      query.roles = { $ne: 'superadmin' }
      if (currentUser.apps?.length > 0) {
        query.apps = { $in: currentUser.apps }
      }
    }

    const [users, total] = await Promise.all([
      AuthUser.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuthUser.countDocuments(query)
    ])

    res.json({
      users: users.map((u: any) => ({
        ...u,
        _id: u._id.toString(),
        roles: u.roles || [],
        permissions: u.permissions || [],
        features: u.features || []
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error listing users:', error)
    res.status(500).json({
      error: 'Failed to list users',
      details: error.message
    })
  }
}

docRouter.get('/users', verifyTokenMiddleware, listUsersController, {
  summary: 'List all users (admin)',
  tags: ['Admin'],
  responseSchema: listUsersResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: errorSchema },
    403: { description: 'Forbidden', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema }
  }
})

export default router
