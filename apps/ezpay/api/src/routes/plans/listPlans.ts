import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { PaginationQuerySchema } from '@ezstart/api-contracts'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getPlanModel } from '../../models/Plan.js'
import { lookupApplicationBySlug } from '../../services/ezauth-client.js'
import { isAdminUser } from '../../middleware/auth.js'
import { authOptionalJwtOrKey } from '../../middleware/unified-auth.js'

export const listPlansRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPlansRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const listPlansQuerySchema = PaginationQuerySchema.extend({
  applicationId: z
    .string()
    .optional()
    .openapi({ description: 'Filter by ezauth Application id (preferred)' }),
  appName: z
    .string()
    .optional()
    .openapi({ description: 'Filter by app slug (deprecated — prefer applicationId)' }),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Include inactive plans (superadmin only)' }),
  active: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Explicit active filter (overrides defaults)' }),
})

const plansListResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.array(z.record(z.unknown())).describe('Array of plan objects'),
  meta: z
    .object({
      total: z.number().describe('Total number of plans matching the filter'),
      limit: z.number().describe('Page size'),
      offset: z.number().describe('Pagination offset'),
    })
    .describe('Pagination metadata'),
})

// ========================================
// Route Handler
// ========================================

const listPlansHandler = async (req: Request, res: Response) => {
  try {
    const validation = listPlansQuerySchema.safeParse(req.query)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
    }

    const { applicationId, appName, includeInactive, active, limit, offset } = validation.data

    // Resolve applicationId — prefer the explicit param, fall back to slug
    // lookup for backwards compat with legacy `?appName=` consumers.
    let resolvedApplicationId = applicationId
    if (!resolvedApplicationId && appName) {
      const app = await lookupApplicationBySlug(appName)
      if (!app) {
        // Unknown slug — return empty page rather than 404 so public pricing
        // pages don't leak whether a slug exists.
        return sendSuccess(res, [], { total: 0, limit, offset })
      }
      resolvedApplicationId = app.id
    }

    const query: Record<string, unknown> = { deletedAt: null }
    if (resolvedApplicationId) query.applicationId = resolvedApplicationId
    if (appName && !applicationId)
      query.$or = [{ applicationId: resolvedApplicationId }, { appName }]

    // Active filter logic:
    // - default: active === true (public pricing pages)
    // - explicit ?active=true|false: honoured
    // - ?includeInactive=true + superadmin: show both
    if (active === 'true') {
      query.active = true
    } else if (active === 'false') {
      query.active = false
    } else if (includeInactive === 'true' && isAdminUser(req)) {
      // Don't filter on active — return both active and inactive rows.
    } else {
      query.active = true
    }

    const Plan = await getPlanModel()

    const [plans, total] = await Promise.all([
      Plan.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(offset).limit(limit).lean(),
      Plan.countDocuments(query),
    ])

    sendSuccess(res, plans, { total, limit, offset })
  } catch (error) {
    logger.error('List plans error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to list plans')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

// PUBLIC — anonymous OK (users need to see plans on pricing pages). When the
// caller IS authenticated (JWT cookie OR admin API key), `req.user` is
// populated so `isAdminUser` can honour `?includeInactive=true`.
docRouter.get('/plans', authOptionalJwtOrKey(), listPlansHandler, {
  summary: 'List subscription plans (public)',
  tags: ['Plans'],
  querySchema: listPlansQuerySchema,
  responseSchema: plansListResponseSchema,
})

export { listPlansRegistry as registry, router }
export default router
