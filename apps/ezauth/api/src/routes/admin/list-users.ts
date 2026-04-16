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
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../../utils/map-to-record.js'
import {
  adminUserSchema,
  adminErrorSchema,
  paginationMetaSchema,
} from '../../types/admin-schemas.js'

export const listUsersRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listUsersRegistry, router)

// OpenAPI: list response matches the monorepo-wide `{ success, data, meta }` shape
const listUsersResponseSchema = z.object({
  success: z.literal(true).describe('Always true for success responses'),
  data: z.array(adminUserSchema).describe('List of users'),
  meta: paginationMetaSchema.describe('Pagination metadata'),
})

// Query validation schema — limit/offset aligned with every other paginated
// list in the monorepo (green-pulse, ezbill, …).
const listUsersQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .default(20)
    .describe('Page size (1-200, default 20)'),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Pagination offset (0-based, default 0)'),
  search: z.string().optional().describe('Free-text search on email/username/name'),
  role: z.string().optional().describe('Filter by role (globalRole or per-app role)'),
  app: z.string().optional().describe('Filter by app membership'),
})

/** Escape user input before embedding in a Mongo `$regex`. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Controller
const listUsersController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!

    const parsedQuery = listUsersQuerySchema.safeParse(req.query)
    if (!parsedQuery.success) {
      return sendValidationError(res, 'Invalid query parameters', parsedQuery.error.issues)
    }

    const AuthUser = await getAuthUserModel()
    const { limit, offset, search, role, app } = parsedQuery.data
    const query: Record<string, unknown> = {}

    // Superadmin sees all users, admin sees non-superadmins in their apps
    if (!currentUser.globalRoles?.includes('superadmin')) {
      query.globalRoles = { $ne: 'superadmin' }
      if ((currentUser.apps?.length ?? 0) > 0) {
        query.apps = { $in: currentUser.apps }
      }
    }

    // App filter: only show users who have logged into this app
    if (app) {
      query.apps = { $in: [app] }
    }

    // Search filter: match email or username (case-insensitive, escaped → no ReDoS)
    if (search) {
      const safe = escapeRegex(search)
      query.$or = [
        { email: { $regex: safe, $options: 'i' } },
        { username: { $regex: safe, $options: 'i' } },
      ]
    }

    // Role filter: match in globalRoles, legacy roles, or any appRoles value
    if (role) {
      query.$and = [
        ...((query.$and as Record<string, unknown>[]) || []),
        {
          $or: [{ globalRoles: role }, { roles: role }],
        },
      ]
    }

    const [users, total] = await Promise.all([
      AuthUser.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AuthUser.countDocuments(query),
    ])

    const data = users.map(u => ({
      ...u,
      _id: u._id.toString(),
      globalRoles: u.globalRoles || [],
      appRoles: mapToRecord(u.appRoles as unknown as Map<string, string[]> | undefined),
      permissions: u.permissions || [],
      features: u.features || [],
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
      updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : String(u.updatedAt),
      lastActiveAt:
        u.lastActiveAt instanceof Date ? u.lastActiveAt.toISOString() : (u.lastActiveAt ?? null),
    }))

    sendSuccess(res, data, { total, limit, offset })
  } catch (error: unknown) {
    logger.error('Error listing users:', error)
    sendError(res, 'Failed to list users', 500)
  }
}

docRouter.get('/users', verifyTokenMiddleware, requireAdmin, listUsersController, {
  summary: 'List all users (admin)',
  tags: ['Admin'],
  querySchema: listUsersQuerySchema,
  responseSchema: listUsersResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: adminErrorSchema },
    403: { description: 'Forbidden', schema: adminErrorSchema },
    500: { description: 'Server error', schema: adminErrorSchema },
  },
})

export default router
