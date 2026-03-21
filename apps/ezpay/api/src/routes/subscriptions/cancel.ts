import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import { cancelSubscription } from '../../services/stripe.js'
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
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      })
    }

    await cancelSubscription(subscriptionId)

    await Payment.updateOne(
      { _id: payment._id },
      { status: 'cancelled' }
    )

    console.log(`❌ Subscription cancelled: ${subscriptionId}`)

    res.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
    })
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/subscriptions/:subscriptionId/cancel', cancelSubscriptionHandler, {
  summary: 'Cancel an active subscription',
  tags: ['Subscriptions'],
  responseSchema: cancelResponseSchema,
})

export { cancelSubscriptionRegistry as registry, router }
export default router
