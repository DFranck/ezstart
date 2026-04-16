import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
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
  search: z.string().optional().describe('Search by customer email (case-insensitive)'),
  liveMode: z
    .enum(['true', 'false'])
    .optional()
    .describe('Filter by live mode (true=production, false=test)'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Number of payments to return'),
  offset: z.coerce.number().min(0).default(0).describe('Number of payments to skip'),
})

const paymentsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of payments'),
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

const listPaymentsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = paymentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const { type, status, projectId, search, liveMode, limit = 20, offset = 0 } = parsed.data

    const query: Record<string, unknown> = {}

    // Non-admin users can only see their own payments
    const isAdmin = isAdminUser(req)

    if (!isAdmin) {
      if (!req.userId) {
        return sendSuccess(res, [], { total: 0, limit: Number(limit), offset: Number(offset) })
      }
      query.userId = req.userId
    }

    if (type) query.type = type
    if (status) query.status = status
    if (projectId) query.projectId = projectId
    if (search) query.customerEmail = { $regex: search, $options: 'i' }
    if (liveMode !== undefined) query.liveMode = liveMode === 'true'

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

docRouter.get('/payments', authMiddleware, populateUserFromToken, listPaymentsHandler, {
  summary: 'List payments (admin: all, user: own)',
  tags: ['Payments'],
  querySchema: paymentsQuerySchema,
  responseSchema: paymentsListResponseSchema,
})

export { listPaymentsRegistry as registry, router }
export default router
