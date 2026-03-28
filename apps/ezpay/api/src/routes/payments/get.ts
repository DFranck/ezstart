import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { authMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const getPaymentRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getPaymentRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const paymentResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z.any().optional().describe('Payment object'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const getPaymentHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const { paymentId } = req.params

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }],
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      })
    }

    res.json({
      success: true,
      payment,
    })
  } catch (error) {
    console.error('Get payment error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
    })
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/payments/:paymentId', authMiddleware, getPaymentHandler, {
  summary: 'Get a payment by ID',
  tags: ['Payments'],
  responseSchema: paymentResponseSchema,
})

export { getPaymentRegistry as registry, router }
export default router
