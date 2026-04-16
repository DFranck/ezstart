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
import { optionalAuthMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listDonationsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listDonationsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const donationsQuerySchema = z.object({
  projectId: z.string().optional().openapi({ description: 'Filter by project ID' }),
  limit: z.coerce.number().default(20).openapi({ description: 'Number of donations to return' }),
  offset: z.coerce.number().default(0).openapi({ description: 'Number of donations to skip' }),
})

const donationsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.record(z.unknown())).describe('List of public donations'),
  meta: z
    .object({
      total: z.number().describe('Total number of donations matching the query'),
      limit: z.number().describe('Number of donations returned'),
      offset: z.number().describe('Number of donations skipped'),
    })
    .describe('Pagination metadata'),
})

// ========================================
// Route Handler
// ========================================

const getDonationsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = donationsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const { projectId, limit, offset } = parsed.data

    const query: Record<string, unknown> = {
      type: { $in: ['donation', 'testimonial'] },
      status: 'completed',
      'metadata.isPublic': true,
    }

    if (projectId) {
      query.projectId = projectId
    }

    const [donations, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .select('-customerEmail -paymentId'),
      Payment.countDocuments(query),
    ])

    sendSuccess(res, donations, { total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    logger.error('Get donations error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch donations')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/donations', optionalAuthMiddleware, getDonationsHandler, {
  summary: 'Get public donations (testimonials wall)',
  tags: ['Donations'],
  querySchema: donationsQuerySchema,
  responseSchema: donationsListResponseSchema,
})

export { listDonationsRegistry as registry, router }
export default router
