import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const listUsersRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listUsersRegistry, router)

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

const paginationSchema = z.object({
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Items per page'),
  total: z.number().describe('Total number of items'),
  totalPages: z.number().describe('Total number of pages'),
})

const listUsersResponseSchema = z.object({
  users: z.array(userSchema).describe('List of users'),
  pagination: paginationSchema.describe('Pagination metadata'),
})

const errorSchema = z.object({
  error: z.string().describe('Error message'),
  details: z.string().optional().describe('Additional error details'),
})

// Query validation schema
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
  search: z.string().optional(),
  role: z.string().optional(),
})

// Controller
const listUsersController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!

    const parsedQuery = listUsersQuerySchema.safeParse(req.query)
    if (!parsedQuery.success) {
      return sendValidationError(res, 'Invalid query parameters', parsedQuery.error.issues)
    }

    const AuthUser = await getAuthUserModel()
    const { page, limit } = parsedQuery.data

    const query: Record<string, unknown> = {}

    // Superadmin sees all users, admin sees non-superadmins in their apps
    if (!currentUser.roles?.includes('superadmin')) {
      query.roles = { $ne: 'superadmin' }
      if ((currentUser.apps?.length ?? 0) > 0) {
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
      AuthUser.countDocuments(query),
    ])

    sendSuccess(res, {
      users: users.map(
        (
          u: Record<string, unknown> & {
            _id: { toString(): string }
            roles?: string[]
            permissions?: string[]
            features?: string[]
          }
        ) => ({
          ...u,
          _id: u._id.toString(),
          roles: u.roles || [],
          permissions: u.permissions || [],
          features: u.features || [],
        })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    logger.error('Error listing users:', error)
    sendError(res, 'Failed to list users', 500)
  }
}

docRouter.get('/users', verifyTokenMiddleware, requireAdmin, listUsersController, {
  summary: 'List all users (admin)',
  tags: ['Admin'],
  responseSchema: listUsersResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: errorSchema },
    403: { description: 'Forbidden', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
