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
import { getProviderForRequest, isStripeModeUnavailableError } from '../../services/stripe.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { auditLogService } from '../../services/audit-log.service.js'
import { resolveTenantAccess } from '../../services/tenant-ownership.js'
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

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }],
    })

    if (!payment) {
      return sendError(res, 'Payment not found', 404)
    }

    // Authorisation (LOW-a) — `resolveTenantAccess` is the sole authority. A
    // binary `isAdminUser` gate placed BEFORE this check rejected app-admins
    // outright, so an app-admin could not refund payments for their OWN
    // tenant. `resolveTenantAccess` already encodes the correct rule:
    //   - superadmin → platform-wide access,
    //   - app-admin / owner → only Applications they own,
    //   - anyone else (plain user, foreign app-admin) → denied (cross-tenant
    //     escalation stays a 403, finding C-3).
    const access = await resolveTenantAccess(req, payment.projectId)
    if (!access.allowed) {
      return sendError(res, 'You can only refund payments for your own applications', 403)
    }

    if (payment.status === 'refunded') {
      return sendError(res, 'Payment already refunded', 400)
    }

    if (!payment.stripePaymentIntentId) {
      return sendError(res, 'No payment intent found — cannot refund', 400)
    }

    // Refund through the provider for the caller's derived mode — a test-mode
    // refund hits the test Stripe account, a live refund the live account.
    // Fail-closed (503) when the mode's key is missing.
    await getProviderForRequest(req).refundPayment(payment.stripePaymentIntentId)

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
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Refund refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
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
