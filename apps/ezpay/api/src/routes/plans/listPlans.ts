import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { getPlanModel } from '../../models/Plan.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listPlansRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPlansRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const listPlansQuerySchema = z.object({
  appName: z.string().optional().describe('Filter by app name'),
  active: z.enum(['true', 'false']).optional().describe('Filter by active status'),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Max results'),
  offset: z.coerce.number().int().min(0).default(0).describe('Offset for pagination'),
})

const plansListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
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

    const { appName, active, limit, offset } = validation.data

    const query: Record<string, unknown> = { deletedAt: null }
    if (appName) query.appName = appName
    if (active !== undefined) query.active = active === 'true'

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

// PUBLIC — no auth middleware (users need to see plans on pricing pages)
docRouter.get('/plans', listPlansHandler, {
  summary: 'List subscription plans (public)',
  tags: ['Plans'],
  querySchema: listPlansQuerySchema,
  responseSchema: plansListResponseSchema,
})

export { listPlansRegistry as registry, router }
export default router
