import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const listPurchasesRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listPurchasesRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const purchasesQuerySchema = z.object({
  userId: z.string().optional().describe('Filter by user ID'),
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.coerce.number().default(50).describe('Number of purchases to return'),
})

const purchasesListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of purchases'),
  total: z.number().describe('Total number of purchases matching the query'),
})

// ========================================
// Route Handler
// ========================================

const getPurchasesHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const { userId, projectId, limit = 50 } = req.query

    const query: any = {
      type: { $in: ['purchase', 'subscription'] },
    }

    if (userId) query.userId = userId
    if (projectId) query.projectId = projectId

    const purchases = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    const total = await Payment.countDocuments(query)

    res.json({
      success: true,
      payments: purchases,
      total,
    })
  } catch (error) {
    console.error('Get purchases error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases',
    })
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/purchases', getPurchasesHandler, {
  summary: 'Get purchases for a user',
  tags: ['Purchases'],
  querySchema: purchasesQuerySchema,
  responseSchema: purchasesListResponseSchema,
})

export { listPurchasesRegistry as registry, router }
export default router
