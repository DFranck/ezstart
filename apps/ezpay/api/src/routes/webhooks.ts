import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { stripe } from '../services/stripe.js'
import { getPaymentModel } from '../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import Stripe from 'stripe'

const router: ExpressRouter = Router()

// Stripe webhook handler
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  const sig = req.headers['stripe-signature']

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return sendError(res, 'Missing signature or webhook secret', 400)
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    logger.error('Webhook signature verification failed:', err instanceof Error ? err : String(err))
    return sendError(res, 'Invalid signature', 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        logger.info(`🔍 Looking for payment with ID: ${session.id}`)

        const updateData: Record<string, unknown> = {
          status: 'completed',
          completedAt: new Date(),
          paymentMethod: session.payment_method_types?.[0],
        }

        // Store payment intent ID for refund lookups
        if (session.payment_intent) {
          updateData.stripePaymentIntentId = session.payment_intent as string
        }

        // Store subscription ID if this was a subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          updateData['metadata.subscriptionId'] = session.subscription as string
        }

        const result = await Payment.updateOne({ paymentId: session.id }, updateData)

        if (result.matchedCount === 0) {
          logger.error(`❌ Payment not found in DB: ${session.id}`)
        } else {
          logger.info(`✅ Payment completed: ${session.id}`)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session

        // Update payment status to cancelled
        await Payment.updateOne({ paymentId: session.id }, { status: 'cancelled' })

        logger.info(`⏰ Payment expired: ${session.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        // Look up by stripePaymentIntentId (payments are stored by session.id, not charge.id)
        await Payment.updateOne(
          { stripePaymentIntentId: charge.payment_intent as string },
          { status: 'refunded' }
        )

        logger.info(`↩️ Payment refunded: ${charge.payment_intent}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Map Stripe subscription statuses to our payment statuses
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

        const mappedStatus = statusMap[subscription.status] || 'pending'

        await Payment.updateOne(
          { 'metadata.subscriptionId': subscription.id },
          { status: mappedStatus }
        )

        logger.info(`📅 Subscription updated: ${subscription.id} → ${mappedStatus}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription status to cancelled
        await Payment.updateOne(
          { 'metadata.subscriptionId': subscription.id },
          { status: 'cancelled' }
        )

        logger.info(`❌ Subscription cancelled: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string | null

        if (subscriptionId) {
          await Payment.updateOne(
            { 'metadata.subscriptionId': subscriptionId },
            { status: 'failed' }
          )

          logger.info(`💥 Invoice payment failed for subscription: ${subscriptionId}`)
        }
        break
      }

      default:
        logger.info(`ℹ️ Unhandled event type: ${event.type}`)
    }

    sendSuccess(res, { received: true })
  } catch (error) {
    logger.error('Webhook processing error:', error instanceof Error ? error : String(error))
    sendError(res, 'Webhook processing failed', 500)
  }
})

export default router
