import { logger } from '@ezstart/logger/server'
import {
  Router,
  attachDerivedScope,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
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
      'Optional debugging override (superadmin only). The scope is auto-derived from the JWT roles by `attachDerivedScope`.',
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

/**
 * Build the Mongo query filter for the derived RBAC scope. Mirrors the helper
 * in `payments/list.ts` — see the long-form rationale there.
 *
 * **P0 multi-tenancy fix (2026-05-01)** — when the caller authenticated via
 * an API key bound to a specific slug (`req.apiKeyAppSlug` is set and not
 * `'*'`), short-circuit BEFORE calling `listApplicationsByOwner`. Without
 * the short-circuit, the helper falls back to `EZPAY_SERVER_EZAUTH_KEY`
 * (platform superadmin) and leaks slugs the key has no business reading.
 */
async function buildScopeFilter(
  req: Request,
  scope: 'mine' | 'myApps' | 'all'
): Promise<Record<string, unknown>> {
  const userId = req.userId
  if (scope === 'all') {
    return {}
  }
  if (scope === 'myApps') {
    // P0 multi-tenancy short-circuit: API-key auth with bound slug.
    const apiKeyAppSlug = req.apiKeyAppSlug
    if (apiKeyAppSlug && apiKeyAppSlug !== '*') {
      return {
        $or: [{ userId }, { projectId: apiKeyAppSlug }],
      }
    }
    const bearerToken = extractBearerToken(req)
    const apps = await listApplicationsByOwner({ bearerToken })
    const ownedSlugs = apps.map(a => a.slug)
    if (ownedSlugs.length === 0) {
      return { userId }
    }
    return {
      $or: [{ userId }, { projectId: { $in: ownedSlugs } }],
    }
  }
  return { userId }
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
    const { projectId, userId, liveMode, limit, offset } = parsed.data

    // Audience scope is server-derived from the JWT (`attachDerivedScope`).
    // The `?scope=` query param is honoured ONLY for superadmins as a
    // debugging hatch (handled in the middleware).
    const effectiveScope = req.derivedScope ?? 'mine'

    const scopeFilter = await buildScopeFilter(req, effectiveScope)

    const query: Record<string, unknown> = {
      ...scopeFilter,
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

docRouter.get('/subscriptions', authJwtOrKey(), attachDerivedScope, getSubscriptionsHandler, {
  summary: 'List subscriptions (auto-scoped: superadmin = all, admin = owned apps, user = own)',
  tags: ['Subscriptions'],
  querySchema: subscriptionsQuerySchema,
  responseSchema: subscriptionsListResponseSchema,
})

export { listSubscriptionsRegistry as registry, router }
export default router
