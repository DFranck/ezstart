import { Router } from '@ezstart/express-core'
import { stripe } from '../services/stripe.js'
import { getPaymentModel } from '../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import Stripe from 'stripe'

const router: ExpressRouter = Router()

// Stripe webhook handler
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  const sig = req.headers['stripe-signature']

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log(`🔍 Looking for payment with ID: ${session.id}`)

        const updateData: any = {
          status: 'completed',
          completedAt: new Date(),
          paymentMethod: session.payment_method_types?.[0],
        }

        // Store subscription ID if this was a subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          updateData['metadata.subscriptionId'] = session.subscription as string
        }

        const result = await Payment.updateOne(
          { paymentId: session.id },
          updateData
        )

        if (result.matchedCount === 0) {
          console.error(`❌ Payment not found in DB: ${session.id}`)
        } else {
          console.log(`✅ Payment completed: ${session.id}`)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session

        // Update payment status to cancelled
        await Payment.updateOne({ paymentId: session.id }, { status: 'cancelled' })

        console.log(`⏰ Payment expired: ${session.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        // Update payment status to refunded
        await Payment.updateOne({ paymentId: charge.id }, { status: 'refunded' })

        console.log(`↩️ Payment refunded: ${charge.id}`)
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

        console.log(`📅 Subscription updated: ${subscription.id} → ${mappedStatus}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription status to cancelled
        await Payment.updateOne(
          { 'metadata.subscriptionId': subscription.id },
          { status: 'cancelled' }
        )

        console.log(`❌ Subscription cancelled: ${subscription.id}`)
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

          console.log(`💥 Invoice payment failed for subscription: ${subscriptionId}`)
        }
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
