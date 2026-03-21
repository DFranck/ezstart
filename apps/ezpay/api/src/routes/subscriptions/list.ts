import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
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
  limit: z.coerce.number().default(50).describe('Number of subscriptions to return'),
})

const subscriptionsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of subscriptions'),
  total: z.number().describe('Total number of subscriptions matching the query'),
})

// ========================================
// Route Handler
// ========================================

const getSubscriptionsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const { userId, limit = 50 } = req.query

    const query: any = {
      type: 'subscription',
    }

    if (userId) query.userId = userId

    const subscriptions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    const total = await Payment.countDocuments(query)

    res.json({
      success: true,
      payments: subscriptions,
      total,
    })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
    })
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/subscriptions', getSubscriptionsHandler, {
  summary: 'Get subscriptions for a user',
  tags: ['Subscriptions'],
  querySchema: subscriptionsQuerySchema,
  responseSchema: subscriptionsListResponseSchema,
})

export { listSubscriptionsRegistry as registry, router }
export default router
