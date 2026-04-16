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

export const listSubscriptionsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listSubscriptionsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const subscriptionsQuerySchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  userId: z.string().optional().describe('Filter by user ID'),
  liveMode: z
    .enum(['true', 'false'])
    .optional()
    .describe('Filter by live mode (true=production, false=test)'),
  limit: z.coerce.number().default(20).describe('Number of subscriptions to return'),
  offset: z.coerce.number().default(0).describe('Number of subscriptions to skip'),
})

const subscriptionsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of subscriptions'),
  meta: z
    .object({
      total: z.number().describe('Total number of subscriptions matching the query'),
      limit: z.number().describe('Number of subscriptions returned'),
      offset: z.number().describe('Number of subscriptions skipped'),
    })
    .describe('Pagination metadata'),
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
    const { projectId, userId, liveMode, limit, offset } = parsed.data

    const query: Record<string, unknown> = {
      type: 'subscription',
    }

    if (projectId) query.projectId = projectId
    if (liveMode !== undefined) query.liveMode = liveMode === 'true'

    // Non-admin users can only see their own subscriptions
    if (isAdminUser(req)) {
      // Admin can filter by specific userId or see all
      if (userId) query.userId = userId
    } else {
      // Force filter to authenticated user's own subscriptions
      query.userId = req.userId
    }

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

docRouter.get('/subscriptions', authMiddleware, populateUserFromToken, getSubscriptionsHandler, {
  summary: 'Get subscriptions for a user',
  tags: ['Subscriptions'],
  querySchema: subscriptionsQuerySchema,
  responseSchema: subscriptionsListResponseSchema,
})

export { listSubscriptionsRegistry as registry, router }
export default router
