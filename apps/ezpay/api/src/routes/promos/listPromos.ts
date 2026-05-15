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
import { getPromoModel } from '../../models/Promo.js'
import { isAdminUser } from '../../middleware/auth.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listPromosRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPromosRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const listPromosQuerySchema = PaginationQuerySchema.extend({
  appName: z.string().optional().openapi({ description: 'Filter by app name' }),
  active: z.enum(['true', 'false']).optional().openapi({ description: 'Filter by active status' }),
})

const promosListResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.array(z.record(z.unknown())).describe('Array of promo objects'),
  meta: z
    .object({
      total: z.number().describe('Total number of promos matching the filter'),
      limit: z.number().describe('Page size'),
      offset: z.number().describe('Pagination offset'),
    })
    .describe('Pagination metadata'),
})

// ========================================
// Route Handler
// ========================================

const listPromosHandler = async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const validation = listPromosQuerySchema.safeParse(req.query)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
    }

    const { appName, active, limit, offset } = validation.data

    const query: Record<string, unknown> = { deletedAt: null }
    if (appName) query.appName = appName
    if (active !== undefined) query.active = active === 'true'

    const Promo = await getPromoModel()

    const [promos, total] = await Promise.all([
      Promo.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      Promo.countDocuments(query),
    ])

    sendSuccess(res, promos, { total, limit, offset })
  } catch (error) {
    logger.error('List promos error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to list promos')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/promos', authJwtOrKey({ requireKeyScope: 'admin' }), listPromosHandler, {
  summary: 'List promo codes (admin only)',
  tags: ['Promos'],
  querySchema: listPromosQuerySchema,
  responseSchema: promosListResponseSchema,
})

export { listPromosRegistry as registry, router }
export default router
