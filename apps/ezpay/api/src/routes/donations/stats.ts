import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
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
  projectId: z.string().optional().describe('Filter stats by project ID'),
})

const donationStatsResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  stats: z.object({
    total: z.number().describe('Total amount donated'),
    count: z.number().describe('Total number of donations'),
    byType: z.object({
      donation: z.object({
        total: z.number().describe('Total amount from donations'),
        count: z.number().describe('Number of donations'),
      }),
    }),
    recent: z.array(z.any()).describe('Recent donations (last 5)'),
  }).describe('Donation statistics'),
})

// ========================================
// Route Handler
// ========================================

const getDonationStatsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  try {
    const parsed = donationStatsQuerySchema.safeParse(req.query)
    const { projectId } = parsed.success ? parsed.data : req.query as any

    const query: any = {
      type: 'donation',
      status: 'completed',
    }

    if (projectId) {
      query.projectId = projectId
    }

    const donations = await Payment.find(query)

    const total = donations.reduce((sum, d) => sum + d.amount, 0)
    const count = donations.length

    const recent = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-customerEmail -paymentId')

    sendSuccess(res, {
      total,
      count,
      byType: {
        donation: { total, count },
      },
      recent,
    })
  } catch (error) {
    logger.error('Get donation stats error:', error)
    sendError(res, 'Failed to fetch donation stats')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/donations/stats', getDonationStatsHandler, {
  summary: 'Get donation statistics',
  tags: ['Donations'],
  querySchema: donationStatsQuerySchema,
  responseSchema: donationStatsResponseSchema,
})

export { donationStatsRegistry as registry, router }
export default router
