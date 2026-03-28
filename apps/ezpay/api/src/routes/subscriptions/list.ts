import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listSubscriptionsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listSubscriptionsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const subscriptionsQuerySchema = z.object({
  userId: z.string().optional().describe('Filter by user ID'),
  limit: z.coerce.number().default(20).describe('Number of subscriptions to return'),
  offset: z.coerce.number().default(0).describe('Number of subscriptions to skip'),
})

const subscriptionsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of subscriptions'),
  meta: z.object({
    total: z.number().describe('Total number of subscriptions matching the query'),
    limit: z.number().describe('Number of subscriptions returned'),
    offset: z.number().describe('Number of subscriptions skipped'),
  }),
})

// ========================================
// Route Handler
// ========================================

const getSubscriptionsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const { userId, limit = 20, offset = 0 } = req.query

    const query: any = {
      type: 'subscription',
    }

    if (userId) query.userId = userId

    const [subscriptions, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ])

    res.json({
      success: true,
      payments: subscriptions,
      meta: { total, limit: Number(limit), offset: Number(offset) },
    })
  } catch (error) {
    logger.error('Get subscriptions error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
    })
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/subscriptions', authMiddleware, getSubscriptionsHandler, {
  summary: 'Get subscriptions for a user',
  tags: ['Subscriptions'],
  querySchema: subscriptionsQuerySchema,
  responseSchema: subscriptionsListResponseSchema,
})

export { listSubscriptionsRegistry as registry, router }
export default router
