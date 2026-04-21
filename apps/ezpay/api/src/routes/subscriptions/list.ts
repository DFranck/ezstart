import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { hasRole } from '@ezstart/auth-sdk/rbac/client'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import { listApplicationsByOwner } from '../../services/ezauth-client.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listSubscriptionsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listSubscriptionsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const subscriptionsQuerySchema = z.object({
  scope: z.enum(['mine', 'myApps', 'all']).optional().openapi({
    description:
      'RBAC scope: `mine` (own subscriptions — default), `myApps` (app owner view), `all` (superadmin only)',
  }),
  projectId: z.string().optional().openapi({ description: 'Filter by project ID' }),
  userId: z.string().optional().openapi({ description: 'Filter by user ID' }),
  liveMode: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Filter by live mode (true=production, false=test)' }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ description: 'Number of subscriptions to return' }),
  offset: z.coerce
    .number()
    .min(0)
    .default(0)
    .openapi({ description: 'Number of subscriptions to skip' }),
})

const subscriptionsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.record(z.unknown())).describe('List of subscriptions'),
  meta: z
    .object({
      total: z.number().describe('Total number of subscriptions matching the query'),
      limit: z.number().describe('Number of subscriptions returned'),
      offset: z.number().describe('Number of subscriptions skipped'),
    })
    .describe('Pagination metadata'),
})

// ========================================
// Helpers
// ========================================

function isSuperadmin(req: Request): boolean {
  const user = req.user as Parameters<typeof hasRole>[0] | undefined
  if (!user) return false
  return hasRole(user, 'superadmin')
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  return cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
}

async function buildScopeFilter(
  req: Request,
  scope: 'mine' | 'myApps' | 'all'
): Promise<{ filter: Record<string, unknown> | null; status?: number; error?: string }> {
  if (!req.userId) {
    return { filter: null, status: 401, error: 'Authentication required' }
  }

  if (scope === 'all') {
    if (!isSuperadmin(req)) {
      return { filter: null, status: 403, error: 'Superadmin access required for scope=all' }
    }
    return { filter: {} }
  }

  if (scope === 'myApps') {
    const bearerToken = extractBearerToken(req)
    const apps = await listApplicationsByOwner({ bearerToken })
    const ownedSlugs = apps.map(a => a.slug)
    if (ownedSlugs.length === 0) {
      return { filter: { userId: req.userId } }
    }
    return {
      filter: {
        $or: [{ userId: req.userId }, { projectId: { $in: ownedSlugs } }],
      },
    }
  }

  return { filter: { userId: req.userId } }
}

// ========================================
// Route Handler
// ========================================

const getSubscriptionsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = subscriptionsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const { scope, projectId, userId, liveMode, limit, offset } = parsed.data

    // Resolve effective scope: explicit param wins; else preserve legacy
    // behaviour (admin => all, user => mine).
    const effectiveScope: 'mine' | 'myApps' | 'all' = scope ?? (isAdminUser(req) ? 'all' : 'mine')

    const scopeResult = await buildScopeFilter(req, effectiveScope)
    if (!scopeResult.filter) {
      return sendError(res, scopeResult.error || 'Forbidden', scopeResult.status ?? 403)
    }

    const query: Record<string, unknown> = {
      ...scopeResult.filter,
      type: 'subscription',
    }

    if (projectId) query.projectId = projectId
    if (liveMode !== undefined) query.liveMode = liveMode === 'true'

    // Admin-only: when scope=all, allow narrowing by a specific userId.
    if (effectiveScope === 'all' && userId) {
      query.userId = userId
    }

    const [subscriptions, total] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)),
      Payment.countDocuments(query),
    ])

    sendSuccess(res, subscriptions, { total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    logger.error('Get subscriptions error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch subscriptions')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/subscriptions', authMiddleware, populateUserFromToken, getSubscriptionsHandler, {
  summary: 'List subscriptions (scoped: mine | myApps | all)',
  tags: ['Subscriptions'],
  querySchema: subscriptionsQuerySchema,
  responseSchema: subscriptionsListResponseSchema,
})

export { listSubscriptionsRegistry as registry, router }
export default router
