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
import { getApplication, listApplicationsByOwner } from '../../services/ezauth-client.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listPaymentsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPaymentsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const paymentsQuerySchema = z.object({
  scope: z.enum(['mine', 'myApps', 'all']).optional().openapi({
    description:
      'RBAC scope: `mine` (own payments — default), `myApps` (app owner view), `all` (superadmin only)',
  }),
  applicationId: z.string().optional().openapi({
    description:
      'Restrict results to a single Ezauth Application (resolved to the underlying project slug). Combined with `scope` via AND.',
  }),
  type: z
    .enum(['donation', 'purchase', 'subscription', 'invoice'])
    .optional()
    .openapi({ description: 'Filter by payment type' }),
  status: z
    .enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional()
    .openapi({ description: 'Filter by payment status' }),
  projectId: z.string().optional().openapi({ description: 'Filter by project ID' }),
  search: z
    .string()
    .optional()
    .openapi({ description: 'Search by customer email (case-insensitive)' }),
  liveMode: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Filter by live mode (true=production, false=test)' }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ description: 'Number of payments to return' }),
  offset: z.coerce
    .number()
    .min(0)
    .default(0)
    .openapi({ description: 'Number of payments to skip' }),
})

const paymentsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.record(z.unknown())).describe('List of payments'),
  meta: z
    .object({
      total: z.number().describe('Total number of payments matching the query'),
      limit: z.number().describe('Number of payments returned'),
      offset: z.number().describe('Number of payments skipped'),
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

/**
 * Build the Mongo query filter for the given RBAC scope.
 * - `mine` (default): only the caller's own payments (via `userId`).
 * - `myApps`: payments on Applications the caller owns (via `projectId IN [slugs]`)
 *   UNION their own payments (so the caller sees revenue from owned apps + their
 *   personal subscriptions).
 * - `all`: no scope filter. Requires superadmin — otherwise caller gets 403.
 */
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
      // No owned apps — fall back to just the user's own payments.
      return { filter: { userId: req.userId } }
    }
    return {
      filter: {
        $or: [{ userId: req.userId }, { projectId: { $in: ownedSlugs } }],
      },
    }
  }

  // scope === 'mine' (default)
  return { filter: { userId: req.userId } }
}

// ========================================
// Route Handler
// ========================================

const listPaymentsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = paymentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const {
      scope,
      applicationId,
      type,
      status,
      projectId,
      search,
      liveMode,
      limit = 20,
      offset = 0,
    } = parsed.data

    // Resolve effective scope:
    // - Explicit `scope` query param takes precedence when provided.
    // - Otherwise, preserve legacy behaviour: admins see everything, users see
    //   only their own payments (equivalent to `scope=all` for admins, `mine`
    //   for users).
    const effectiveScope: 'mine' | 'myApps' | 'all' = scope ?? (isAdminUser(req) ? 'all' : 'mine')

    const scopeResult = await buildScopeFilter(req, effectiveScope)
    if (!scopeResult.filter) {
      return sendError(res, scopeResult.error || 'Forbidden', scopeResult.status ?? 403)
    }

    const query: Record<string, unknown> = { ...scopeResult.filter }

    if (type) query.type = type
    if (status) query.status = status
    if (projectId) query.projectId = projectId
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.customerEmail = { $regex: escapedSearch, $options: 'i' }
    }
    if (liveMode !== undefined) query.liveMode = liveMode === 'true'

    // `applicationId` is combined with the RBAC scope via AND: a regular user
    // with `scope=mine` who passes `applicationId=app_x` only sees their own
    // payments for app_x; a superadmin with `scope=all` still gets scoped to
    // app_x. This is what prevents BillingDashboard cross-app leaks.
    // Resolved AFTER the other filters so it authoritatively sets `projectId`.
    if (applicationId) {
      const app = await getApplication(applicationId, {
        bearerToken: extractBearerToken(req),
      })
      if (!app) {
        // Fail-closed: unknown/forbidden application → return 0 results instead
        // of leaking the scope filter. This also handles the ezauth circuit
        // being open (we must not widen the result set in that case).
        return sendSuccess(res, [], { total: 0, limit: Number(limit), offset: Number(offset) })
      }
      // When both `applicationId` and `projectId` are supplied, require them to
      // match — otherwise the caller is sending contradictory filters and we
      // fail-closed rather than silently favouring one over the other.
      if (projectId && projectId !== app.slug) {
        return sendSuccess(res, [], { total: 0, limit: Number(limit), offset: Number(offset) })
      }
      query.projectId = app.slug
    }

    const [payments, total] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)),
      Payment.countDocuments(query),
    ])

    sendSuccess(res, payments, { total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    logger.error('List payments error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch payments')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/payments', authMiddleware, populateUserFromToken, listPaymentsHandler, {
  summary: 'List payments (scoped: mine | myApps | all)',
  tags: ['Payments'],
  querySchema: paymentsQuerySchema,
  responseSchema: paymentsListResponseSchema,
})

export { listPaymentsRegistry as registry, router }
export default router
