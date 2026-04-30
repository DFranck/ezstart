import type { Request, Response } from 'express'
import {
  attachDerivedScope,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getApplicationModel } from '../../models/application.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
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
    .openapi({ description: 'Page size (1-200, default 20)' }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .openapi({ description: 'Pagination offset (0-based, default 0)' }),
  search: z.string().optional().openapi({ description: 'Free-text search on email/username/name' }),
  role: z
    .string()
    .optional()
    .openapi({ description: 'Filter by role (globalRole or per-app role)' }),
  app: z.string().optional().openapi({ description: 'Filter by app membership' }),
  scope: z.enum(['mine', 'myApps', 'all']).optional().openapi({
    description:
      'Optional debugging override (superadmin only). The scope is auto-derived from the JWT roles by `attachDerivedScope`; non-superadmins cannot escalate via this param.',
  }),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform(v => v === 'true')
    .openapi({
      description:
        'Include soft-deleted users in the listing (default false). Superadmin-only when scope=all; for narrower scopes the flag still gates the model-level pre-find guard but the audience filter applies first.',
    }),
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
    const { limit, offset, search, role, app, includeDeleted } = parsedQuery.data
    const query: Record<string, unknown> = {}

    // `includeDeleted=true` is gated to superadmin platform-wide views — an
    // app-admin auto-scoped to `myApps` can theoretically still toggle it,
    // but the audience filter (apps ⊂ ownedSlugs) constrains the result set
    // to records they're already entitled to see; the flag just lets them
    // see soft-deleted users WITHIN that scope. Non-superadmins on the
    // 'mine' scope are limited to a single record (their own user) so the
    // flag is moot — kept consistent for predictability.
    const findOpts: { includeDeleted?: boolean } = includeDeleted ? { includeDeleted: true } : {}

    // API key scope-based filtering — used as a secondary constraint when the
    // caller authenticated with a single-app API key (legacy contract).
    const apiKeyScope = req.apiKeyScope
    const apiKeyAppName = req.apiKeyAppName

    // Audience selector — derived server-side from `req.user` by
    // `attachDerivedScope`. Superadmins may override via `?scope=` (handled
    // by the middleware), non-superadmins cannot escalate.
    const derivedScope = req.derivedScope ?? 'mine'

    if (derivedScope === 'all') {
      // Platform-wide view — no scope filter.
    } else if (derivedScope === 'myApps') {
      const Application = await getApplicationModel()
      const ownedApps = await Application.find({ ownerId: currentUser._id }).select('slug').lean()
      const ownedSlugs = ownedApps.map(a => a.slug)
      if (ownedSlugs.length === 0) {
        // No owned apps → empty result (app-admin without applications).
        return sendSuccess(res, [], { total: 0, limit, offset })
      }
      query.apps = { $in: ownedSlugs }
    } else {
      // 'mine' — single user view (regular authenticated user).
      query._id = currentUser._id
    }

    // Single-app API key narrows the result set further (orthogonal to the
    // RBAC scope above). A platform-scoped key (appName='*') doesn't filter.
    if (apiKeyAppName && apiKeyAppName !== '*' && apiKeyScope) {
      query.apps = { $in: [apiKeyAppName] }
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
      AuthUser.find(query, null, findOpts)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AuthUser.countDocuments(query, findOpts),
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
      deletedAt: u.deletedAt instanceof Date ? u.deletedAt.toISOString() : (u.deletedAt ?? null),
      scheduledHardDeleteAt:
        u.scheduledHardDeleteAt instanceof Date
          ? u.scheduledHardDeleteAt.toISOString()
          : (u.scheduledHardDeleteAt ?? null),
    }))

    sendSuccess(res, data, { total, limit, offset })
  } catch (error: unknown) {
    logger.error('Error listing users:', error)
    sendError(res, 'Failed to list users', 500)
  }
}

docRouter.get(
  '/users',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireAdmin,
  attachDerivedScope,
  listUsersController,
  {
    summary: 'List all users (admin)',
    tags: ['Admin'],
    querySchema: listUsersQuerySchema,
    responseSchema: listUsersResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
