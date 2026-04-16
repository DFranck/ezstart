import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { getStripeInstance } from '../services/stripe-connect.js'
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import type Stripe from 'stripe'

const router: ExpressRouter = Router()

// ========================================
// Connect Webhook Handler
// ========================================

router.post('/webhooks/stripe-connect', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined

  if (!sig) {
    return sendError(res, 'Missing webhook signature', 400)
  }

  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('STRIPE_CONNECT_WEBHOOK_SECRET not configured')
    return sendError(res, 'Webhook secret not configured', 500)
  }

  const stripe = getStripeInstance()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    logger.error(
      'Connect webhook signature verification failed:',
      err instanceof Error ? err : String(err)
    )
    return sendError(res, 'Invalid signature', 400)
  }

  try {
    switch (event.type) {
      case 'account.updated': {
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break
      }

      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      }

      default:
        logger.info(`Unhandled connect webhook event: ${event.type}`)
    }

    sendSuccess(res, { received: true })
  } catch (error) {
    logger.error(
      'Connect webhook processing error:',
      error instanceof Error ? error : String(error)
    )
    sendError(res, 'Webhook processing failed', 500)
  }
})

// ========================================
// Event Handlers
// ========================================

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const ConnectedAccount = await getConnectedAccountModel()

  const chargesEnabled = account.charges_enabled ?? false
  const payoutsEnabled = account.payouts_enabled ?? false
  const detailsSubmitted = account.details_submitted ?? false

  const status = resolveAccountStatus(chargesEnabled, payoutsEnabled, detailsSubmitted)

  const update: Record<string, unknown> = {
    status,
    chargesEnabled,
    payoutsEnabled,
  }

  if (status === 'active') {
    update.onboardedAt = new Date()
  }

  await ConnectedAccount.updateOne({ stripeAccountId: account.id }, update)

  logger.info(`Connect account updated: ${account.id} → ${status}`)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const transfer = paymentIntent.transfer_data
  if (!transfer) return

  const applicationFee = paymentIntent.application_fee_amount
  const destination =
    typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id

  logger.info(
    `Platform fee collected: ${applicationFee ?? 0} cents → destination ${destination ?? 'unknown'}`
  )
}

// ========================================
// Helpers
// ========================================

function resolveAccountStatus(
  chargesEnabled: boolean,
  payoutsEnabled: boolean,
  detailsSubmitted: boolean
): 'active' | 'restricted' | 'pending' {
  if (chargesEnabled && payoutsEnabled) return 'active'
  if (detailsSubmitted) return 'restricted'
  return 'pending'
}

export default router
