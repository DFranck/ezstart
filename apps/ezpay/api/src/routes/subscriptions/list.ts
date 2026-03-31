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
    const parsed = subscriptionsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const { userId, limit, offset } = parsed.data

    const query: Record<string, unknown> = {
      type: 'subscription',
    }

    if (userId) query.userId = userId

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

docRouter.get('/subscriptions', authMiddleware, getSubscriptionsHandler, {
  summary: 'Get subscriptions for a user',
  tags: ['Subscriptions'],
  querySchema: subscriptionsQuerySchema,
  responseSchema: subscriptionsListResponseSchema,
})

export { listSubscriptionsRegistry as registry, router }
export default router
