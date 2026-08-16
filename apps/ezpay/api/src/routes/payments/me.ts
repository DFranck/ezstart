import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { PaginationQuerySchema } from '@ezstart/api-contracts'
import { getPaymentModel } from '../../models/Payment.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const myPaymentsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(myPaymentsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const myPaymentsQuerySchema = PaginationQuerySchema.extend({
  type: z
    .enum(['donation', 'purchase', 'subscription', 'invoice'])
    .optional()
    .openapi({ description: 'Filter by payment type' }),
  status: z
    .enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional()
    .openapi({ description: 'Filter by payment status' }),
  liveMode: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Filter by live mode (true=production, false=test)' }),
})

const myPaymentsResponseSchema = z.object({
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
// Route Handler
// ========================================

const myPaymentsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    if (!req.userId) {
      return sendSuccess(res, [], { total: 0, limit: 50, offset: 0 })
    }

    const parsed = myPaymentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 'Invalid query parameters', 400)
    }

    const { type, status, liveMode, limit, offset } = parsed.data

    const query: Record<string, unknown> = { userId: req.userId }
    if (type) query.type = type
    if (status) query.status = status
    if (liveMode !== undefined) query.liveMode = liveMode === 'true'

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

docRouter.get('/payments/me', authJwtOrKey(), myPaymentsHandler, {
  summary: 'List authenticated user payments',
  tags: ['Payments'],
  querySchema: myPaymentsQuerySchema,
  responseSchema: myPaymentsResponseSchema,
})

export { myPaymentsRegistry as registry, router }
export default router
