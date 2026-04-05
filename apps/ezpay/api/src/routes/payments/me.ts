import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const myPaymentsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(myPaymentsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const myPaymentsQuerySchema = z.object({
  type: z
    .enum(['donation', 'purchase', 'subscription', 'invoice'])
    .optional()
    .describe('Filter by payment type'),
  status: z
    .enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional()
    .describe('Filter by payment status'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Number of payments to return'),
  offset: z.coerce.number().min(0).default(0).describe('Number of payments to skip'),
})

const myPaymentsResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of payments'),
  meta: z.object({
    total: z.number().describe('Total number of payments matching the query'),
    limit: z.number().describe('Number of payments returned'),
    offset: z.number().describe('Number of payments skipped'),
  }),
})

// ========================================
// Route Handler
// ========================================

const myPaymentsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    if (!req.userId) {
      return sendSuccess(res, [], { total: 0, limit: 20, offset: 0 })
    }

    const parsed = myPaymentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 'Invalid query parameters', 400)
    }

    const { type, status, limit, offset } = parsed.data

    const query: Record<string, unknown> = { userId: req.userId }
    if (type) query.type = type
    if (status) query.status = status

    const [payments, total] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Payment.countDocuments(query),
    ])

    sendSuccess(res, payments, { total, limit, offset })
  } catch (error) {
    logger.error('My payments error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch payments')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/payments/me', authMiddleware, populateUserFromToken, myPaymentsHandler, {
  summary: 'List authenticated user payments',
  tags: ['Payments'],
  querySchema: myPaymentsQuerySchema,
  responseSchema: myPaymentsResponseSchema,
})

export { myPaymentsRegistry as registry, router }
export default router
