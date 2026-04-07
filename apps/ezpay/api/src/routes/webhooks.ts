import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getProvider } from '../services/stripe.js'
import { getPaymentModel } from '../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import type {
  WebhookCheckoutData,
  WebhookRefundData,
  WebhookSubscriptionData,
  WebhookInvoiceData,
} from '@ezstart/pay-sdk/providers'

const router: ExpressRouter = Router()

// Webhook handler (provider-agnostic)
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  const sig = req.headers['stripe-signature'] as string | undefined

  if (!sig) {
    return sendError(res, 'Missing webhook signature', 400)
  }

  const provider = getProvider()
  let event

  try {
    event = provider.verifyWebhookSignature(req.body, sig)
  } catch (err) {
    logger.error('Webhook signature verification failed:', err instanceof Error ? err : String(err))
    return sendError(res, 'Invalid signature', 400)
  }

  // Extract livemode from webhook event
  const eventLiveMode = event.livemode ?? false

  try {
    switch (event.type) {
      case 'checkout.completed': {
        const data = event.data as WebhookCheckoutData

        logger.info(`Looking for payment with ID: ${data.sessionId}`)

        const updateData: Record<string, unknown> = {
          status: 'completed',
          completedAt: new Date(),
          paymentMethod: data.paymentMethod,
          liveMode: eventLiveMode,
        }

        // Store payment intent ID for refund lookups
        if (data.paymentIntentId) {
          updateData.stripePaymentIntentId = data.paymentIntentId
        }

        // Store subscription ID if this was a subscription checkout
        if (data.mode === 'subscription' && data.subscriptionId) {
          updateData['metadata.subscriptionId'] = data.subscriptionId
        }

        const result = await Payment.updateOne({ paymentId: data.sessionId }, updateData)

        if (result.matchedCount === 0) {
          logger.error(`Payment not found in DB: ${data.sessionId}`)
        } else {
          logger.info(`Payment completed: ${data.sessionId}`)
        }
        break
      }

      case 'checkout.expired': {
        const data = event.data as WebhookCheckoutData
        await Payment.updateOne({ paymentId: data.sessionId }, { status: 'cancelled' })
        logger.info(`Payment expired: ${data.sessionId}`)
        break
      }

      case 'payment.refunded': {
        const data = event.data as WebhookRefundData
        await Payment.updateOne(
          { stripePaymentIntentId: data.paymentIntentId },
          { status: 'refunded' }
        )
        logger.info(`Payment refunded: ${data.paymentIntentId}`)
        break
      }

      case 'subscription.updated': {
        const data = event.data as WebhookSubscriptionData

        // Map provider subscription statuses to our payment statuses
        const statusMap: Record<string, string> = {
          active: 'completed',
          past_due: 'pending',
          canceled: 'cancelled',
          unpaid: 'failed',
          trialing: 'completed',
          incomplete: 'pending',
          incomplete_expired: 'failed',
          paused: 'pending',
        }

        const mappedStatus = statusMap[data.status] || 'pending'

        await Payment.updateOne(
          { 'metadata.subscriptionId': data.subscriptionId },
          { status: mappedStatus }
        )
        logger.info(`Subscription updated: ${data.subscriptionId} -> ${mappedStatus}`)
        break
      }

      case 'subscription.deleted': {
        const data = event.data as WebhookSubscriptionData
        await Payment.updateOne(
          { 'metadata.subscriptionId': data.subscriptionId },
          { status: 'cancelled' }
        )
        logger.info(`Subscription cancelled: ${data.subscriptionId}`)
        break
      }

      case 'invoice.payment_failed': {
        const data = event.data as WebhookInvoiceData

        if (data.subscriptionId) {
          await Payment.updateOne(
            { 'metadata.subscriptionId': data.subscriptionId },
            { status: 'failed' }
          )
          logger.info(`Invoice payment failed for subscription: ${data.subscriptionId}`)
        }
        break
      }

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`)
    }

    sendSuccess(res, { received: true })
  } catch (error) {
    logger.error('Webhook processing error:', error instanceof Error ? error : String(error))
    sendError(res, 'Webhook processing failed', 500)
  }
})

export default router
