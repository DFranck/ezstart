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
import { getProvider } from '../../services/stripe.js'
import { isAdminUser } from '../../middleware/auth.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { auditLogService } from '../../services/audit-log.service.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const refundPaymentRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(refundPaymentRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const refundParamsSchema = z.object({
  paymentId: z.string().openapi({ description: 'Payment document ID or paymentId' }),
})

const refundResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z.record(z.unknown()).optional().describe('Updated payment object'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const refundPaymentHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = refundParamsSchema.safeParse(req.params)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid payment ID', validation.error.errors)
    }

    const { paymentId } = validation.data

    // Admin check
    const isAdmin = isAdminUser(req)

    if (!isAdmin) {
      return sendError(res, 'Admin access required', 403)
    }

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }],
    })

    if (!payment) {
      return sendError(res, 'Payment not found', 404)
    }

    if (payment.status === 'refunded') {
      return sendError(res, 'Payment already refunded', 400)
    }

    if (!payment.stripePaymentIntentId) {
      return sendError(res, 'No payment intent found — cannot refund', 400)
    }

    await getProvider().refundPayment(payment.stripePaymentIntentId)

    payment.status = 'refunded'
    await payment.save()

    logger.info(`↩️ Payment refunded: ${payment.paymentId}`)

    // Audit-log refund — sensitive admin action with money side-effects.
    // Best-effort, never blocks the response.
    void auditLogService.createFromRequest(req, {
      action: 'payment.refunded',
      userId: req.userId,
      metadata: {
        paymentId: payment.paymentId,
        documentId: String(payment._id),
        stripePaymentIntentId: payment.stripePaymentIntentId,
        amount: payment.amount,
        currency: payment.currency,
        projectId: payment.projectId,
      },
    })

    sendSuccess(res, payment)
  } catch (error) {
    logger.error('Refund payment error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to refund payment')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post(
  '/payments/:paymentId/refund',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  refundPaymentHandler,
  {
    summary: 'Refund a payment (admin only)',
    tags: ['Payments'],
    paramsSchema: refundParamsSchema,
    responseSchema: refundResponseSchema,
  }
)

export { refundPaymentRegistry as registry, router }
export default router
