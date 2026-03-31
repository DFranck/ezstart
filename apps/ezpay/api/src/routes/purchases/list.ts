import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listPurchasesRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPurchasesRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const purchasesQuerySchema = z.object({
  userId: z.string().optional().describe('Filter by user ID'),
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.coerce.number().default(20).describe('Number of purchases to return'),
  offset: z.coerce.number().default(0).describe('Number of purchases to skip'),
})

const purchasesListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of purchases'),
  meta: z.object({
    total: z.number().describe('Total number of purchases matching the query'),
    limit: z.number().describe('Number of purchases returned'),
    offset: z.number().describe('Number of purchases skipped'),
  }),
})

// ========================================
// Route Handler
// ========================================

const getPurchasesHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = purchasesQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const { userId, projectId, limit, offset } = parsed.data

    const query: Record<string, unknown> = {
      type: { $in: ['purchase', 'subscription'] },
    }

    if (userId) query.userId = userId
    if (projectId) query.projectId = projectId

    const [purchases, total] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)),
      Payment.countDocuments(query),
    ])

    sendSuccess(res, purchases, { total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    logger.error('Get purchases error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch purchases')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/purchases', authMiddleware, getPurchasesHandler, {
  summary: 'Get purchases for a user',
  tags: ['Purchases'],
  querySchema: purchasesQuerySchema,
  responseSchema: purchasesListResponseSchema,
})

export { listPurchasesRegistry as registry, router }
export default router
