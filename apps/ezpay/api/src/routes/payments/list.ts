import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listPaymentsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPaymentsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const paymentsQuerySchema = z.object({
  type: z
    .enum(['donation', 'purchase', 'subscription', 'invoice'])
    .optional()
    .describe('Filter by payment type'),
  status: z
    .enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional()
    .describe('Filter by payment status'),
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Number of payments to return'),
  offset: z.coerce.number().min(0).default(0).describe('Number of payments to skip'),
})

const paymentsListResponseSchema = z.object({
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

const listPaymentsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = paymentsQuerySchema.safeParse(req.query)
    const {
      type,
      status,
      projectId,
      limit = 20,
      offset = 0,
    } = parsed.success ? parsed.data : (req.query as Record<string, string>)

    const user = (req as unknown as { user?: { _id?: string; role?: string } }).user

    const query: Record<string, unknown> = {}

    // Non-admin users can only see their own payments
    if (!user || user.role !== 'admin') {
      if (!user?._id) {
        return sendSuccess(res, [], { total: 0, limit: Number(limit), offset: Number(offset) })
      }
      query.userId = user._id
    }

    if (type) query.type = type
    if (status) query.status = status
    if (projectId) query.projectId = projectId

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

docRouter.get('/payments', authMiddleware, listPaymentsHandler, {
  summary: 'List payments (admin: all, user: own)',
  tags: ['Payments'],
  querySchema: paymentsQuerySchema,
  responseSchema: paymentsListResponseSchema,
})

export { listPaymentsRegistry as registry, router }
export default router
