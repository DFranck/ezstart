import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  createRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getPaymentModel } from '../../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const donationStatsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(donationStatsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const donationStatsQuerySchema = z.object({
  projectId: z.string().optional().openapi({ description: 'Filter stats by project ID' }),
})

const donationStatsResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  stats: z
    .object({
      total: z.number().describe('Total amount donated'),
      count: z.number().describe('Total number of donations'),
      byType: z
        .object({
          donation: z
            .object({
              total: z.number().describe('Total amount from donations'),
              count: z.number().describe('Number of donations'),
            })
            .describe('Donation type breakdown'),
        })
        .describe('Breakdown by payment type'),
      recent: z.array(z.record(z.unknown())).describe('Recent donations (last 5)'),
    })
    .describe('Donation statistics'),
})

// ========================================
// Route Handler
// ========================================

const getDonationStatsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const parsed = donationStatsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }
    const { projectId } = parsed.data

    const query: Record<string, unknown> = {
      type: 'donation',
      status: 'completed',
    }

    if (projectId) {
      query.projectId = projectId
    }

    const [aggregateResult, recent] = await Promise.all([
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.find(query).sort({ createdAt: -1 }).limit(5).select('-customerEmail -paymentId'),
    ])

    const { total = 0, count = 0 } = aggregateResult[0] || {}

    sendSuccess(res, {
      total,
      count,
      byType: {
        donation: { total, count },
      },
      recent,
    })
  } catch (error) {
    logger.error('Get donation stats error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch donation stats')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/donations/stats', createRateLimiter(), getDonationStatsHandler, {
  summary: 'Get donation statistics',
  tags: ['Donations'],
  querySchema: donationStatsQuerySchema,
  responseSchema: donationStatsResponseSchema,
})

export { donationStatsRegistry as registry, router }
export default router
