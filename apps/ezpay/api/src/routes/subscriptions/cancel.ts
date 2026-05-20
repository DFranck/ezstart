import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getPaymentModel } from '../../models/Payment.js'
import { getProvider } from '../../services/stripe.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { resolveTenantAccess } from '../../services/tenant-ownership.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const cancelSubscriptionRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(cancelSubscriptionRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const cancelResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const cancelSubscriptionHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const subscriptionId = req.params.subscriptionId as string

    const payment = await Payment.findOne({
      'metadata.subscriptionId': subscriptionId,
      type: 'subscription',
    })

    if (!payment) {
      return sendError(res, 'Subscription not found', 404)
    }

    // Ownership check. A subscriber may always cancel their own subscription
    // (`payment.userId === req.userId`). Otherwise the caller must be a
    // superadmin OR an admin of the Application the subscription belongs to —
    // a binary admin gate would let an app admin cancel another tenant's
    // subscription (cross-tenant escalation).
    if (payment.userId !== req.userId) {
      const access = await resolveTenantAccess(req, payment.projectId)
      if (!access.allowed) {
        return sendError(res, 'You can only cancel your own subscriptions', 403)
      }
    }

    await getProvider().cancelSubscription(subscriptionId)

    // Mark as canceling at period end — actual cancellation happens via webhook
    // when Stripe fires customer.subscription.deleted at end of billing period
    await Payment.updateOne({ _id: payment._id }, { cancelAtPeriodEnd: true })

    logger.info(`⏳ Subscription set to cancel at period end: ${subscriptionId}`)

    sendSuccess(res, { cancelled: true })
  } catch (error) {
    logger.error('Cancel subscription error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to cancel subscription')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/subscriptions/:subscriptionId/cancel', authJwtOrKey(), cancelSubscriptionHandler, {
  summary: 'Cancel an active subscription',
  tags: ['Subscriptions'],
  responseSchema: cancelResponseSchema,
})

export { cancelSubscriptionRegistry as registry, router }
export default router
