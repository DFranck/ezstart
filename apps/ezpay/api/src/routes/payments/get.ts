import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getPaymentModel } from '../../models/Payment.js'
import { isAdminUser } from '../../middleware/auth.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
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
  payment: z.record(z.unknown()).optional().describe('Payment object'),
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
      return sendError(res, 'Payment not found', 404)
    }

    // Access control: non-admin users can only see their own payments
    const isAdmin = isAdminUser(req)

    if (!isAdmin && payment.userId !== req.userId) {
      return sendError(res, 'Payment not found', 404)
    }

    sendSuccess(res, payment)
  } catch (error) {
    logger.error('Get payment error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to fetch payment')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/payments/:paymentId', authJwtOrKey(), getPaymentHandler, {
  summary: 'Get a payment by ID',
  tags: ['Payments'],
  responseSchema: paymentResponseSchema,
})

export { getPaymentRegistry as registry, router }
export default router
