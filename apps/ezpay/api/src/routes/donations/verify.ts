import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getProviderForRequest, isStripeModeUnavailableError } from '../../services/stripe.js'
import { authOptionalJwtOrKey } from '../../middleware/unified-auth.js'
import { resolveTenantAccess } from '../../services/tenant-ownership.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const verifyPaymentRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(verifyPaymentRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const verifyPaymentParamsSchema = z.object({
  sessionId: z.string().openapi({ description: 'Stripe checkout session ID' }),
})

const paymentResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z
    .record(z.unknown())
    .optional()
    .describe(
      'Payment details. Anonymous / unrelated callers receive a minimal, non-PII projection (status only); the owner / app admin / superadmin receives the full document.'
    ),
  checkoutUrl: z.string().optional().describe('Stripe checkout URL to redirect user'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Helpers
// ========================================

/**
 * Minimal, non-PII projection of a payment. Returned to callers that are NOT
 * entitled to the full record (anonymous post-checkout redirect, unrelated
 * authenticated user). Carries ONLY what a success page needs to confirm the
 * outcome — never `customerEmail`, `customerName`, donor `metadata.message`,
 * amount, etc.
 */
interface PublicPaymentView {
  paymentId: string
  type: PaymentDocument['type']
  status: PaymentDocument['status']
  completed: boolean
}

function toPublicPaymentView(payment: PaymentDocument): PublicPaymentView {
  return {
    paymentId: payment.paymentId,
    type: payment.type,
    status: payment.status,
    completed: payment.status === 'completed',
  }
}

/**
 * Decide whether the caller may see the full payment document. The session id
 * is a Stripe-issued opaque token that comes back on an anonymous browser
 * redirect, so we cannot rely on it as an ownership proof. Full access is
 * granted only to:
 *   - the user who made the payment (`payment.userId === req.userId`); or
 *   - a superadmin / an admin of the Application the payment belongs to.
 * Everyone else (anonymous donor, unrelated user) gets the public projection.
 */
async function callerMayViewFullPayment(req: Request, payment: PaymentDocument): Promise<boolean> {
  if (payment.userId && req.userId && payment.userId === req.userId) {
    return true
  }
  const access = await resolveTenantAccess(req, payment.projectId)
  return access.allowed
}

// ========================================
// Route Handler
// ========================================

const verifyPaymentHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const { sessionId } = req.params

    // Find payment in DB
    const payment = await Payment.findOne({ paymentId: sessionId })

    if (!payment) {
      return sendError(res, 'Payment not found', 404)
    }

    // Scope the response to the caller's entitlement — never leak PII to an
    // anonymous / unrelated caller who merely holds the session id (IDOR).
    const mayViewFull = await callerMayViewFullPayment(req, payment)
    const respond = (): Response =>
      sendSuccess(res, mayViewFull ? payment : toPublicPaymentView(payment))

    // If already completed, return success
    if (payment.status === 'completed') {
      return respond()
    }

    // Verify with the payment provider for the caller's derived mode to
    // prevent fraud. Fail-closed (503) when the mode's key is missing.
    if (!sessionId) {
      return sendError(res, 'Missing sessionId', 400)
    }
    const verification = await getProviderForRequest(req).verifyPayment(sessionId)

    // Only mark as completed if provider confirms payment
    if (verification.paid) {
      payment.status = 'completed'
      payment.completedAt = new Date()
      payment.paymentMethod = verification.paymentMethod
      await payment.save()

      logger.info(`✅ Payment verified and completed: ${sessionId}`)

      respond()
    } else {
      // Payment not confirmed by provider
      logger.warn(`⚠️ Payment not confirmed: ${sessionId} (status: ${verification.status})`)
      sendError(res, 'Payment not confirmed', 400)
    }
  } catch (error) {
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Verify payment refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    logger.error('Verify payment error:', error instanceof Error ? error : String(error))
    sendError(res, 'Failed to verify payment')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/verify-payment/:sessionId', authOptionalJwtOrKey(), verifyPaymentHandler, {
  summary: 'Verify and complete payment after Stripe checkout',
  tags: ['Donations'],
  paramsSchema: verifyPaymentParamsSchema,
  responseSchema: paymentResponseSchema,
})

export { verifyPaymentRegistry as registry, router }
export default router
