import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listDonationsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listDonationsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const donationsQuerySchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.coerce.number().default(10).describe('Number of donations to return'),
})

const donationsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of public donations'),
  total: z.number().describe('Total number of donations matching the query'),
})

// ========================================
// Route Handler
// ========================================

const getDonationsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  try {
    const { projectId, limit = 10 } = req.query

    const query: any = {
      type: 'donation',
      status: 'completed',
      'metadata.isPublic': true,
    }

    if (projectId) {
      query.projectId = projectId
    }

    const donations = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select('-customerEmail -paymentId')

    const total = await Payment.countDocuments(query)

    res.json({
      success: true,
      payments: donations,
      total,
    })
  } catch (error) {
    console.error('Get donations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch donations',
    })
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/donations', getDonationsHandler, {
  summary: 'Get public donations (testimonials wall)',
  tags: ['Donations'],
  querySchema: donationsQuerySchema,
  responseSchema: donationsListResponseSchema,
})

export { listDonationsRegistry as registry, router }
export default router
