import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { getStripeInstanceForMode } from '../services/stripe-connect.js'
import { isStripeModeUnavailableError, type StripeMode } from '../services/stripe.js'
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import type Stripe from 'stripe'

const router: ExpressRouter = Router()

/** Connect webhook signing secret per mode. */
const MODE_CONNECT_SECRET_ENV: Record<StripeMode, string> = {
  live: 'STRIPE_CONNECT_WEBHOOK_SECRET',
  test: 'STRIPE_TEST_CONNECT_WEBHOOK_SECRET',
}

interface VerifiedConnectWebhook {
  event: Stripe.Event
  /** Mode of the secret that verified the signature — the trusted mode. */
  mode: StripeMode
}

/**
 * Verify a Connect webhook signature against BOTH the live and test Connect
 * secrets (Wave E MED-2 / HACK E1.5). Stripe signs test Connect events with
 * the test secret and live events with the live secret; we try live first then
 * test and return the event PLUS the `mode` of the secret that matched.
 *
 * The verified `mode` (NOT the payload's self-declared `event.livemode`) scopes
 * every write — a test-secret-signed event can only ever touch test data. A
 * payload whose `livemode` contradicts the verifying secret is rejected
 * (forged / cross-wired delivery). A mode whose secret OR Stripe key is
 * unconfigured is skipped. Throws when no configured secret verifies.
 */
function verifyConnectWebhook(payload: string | Buffer, signature: string): VerifiedConnectWebhook {
  const order: StripeMode[] = ['live', 'test']
  let lastError: unknown

  for (const mode of order) {
    const secret = process.env[MODE_CONNECT_SECRET_ENV[mode]]
    if (!secret) {
      lastError = new Error(`${MODE_CONNECT_SECRET_ENV[mode]} not configured`)
      continue
    }
    let stripe: Stripe
    try {
      stripe = getStripeInstanceForMode(mode)
    } catch (err) {
      // Mode's Stripe key not configured — skip it.
      if (isStripeModeUnavailableError(err)) {
        lastError = err
        continue
      }
      throw err
    }
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret)
    } catch (err) {
      lastError = err
      continue
    }
    // Bind the mode to the verifying secret. Reject a payload whose livemode
    // contradicts it (forgery / mis-wired endpoint), then trust `mode`.
    const expectedLive = mode === 'live'
    if (typeof event.livemode === 'boolean' && event.livemode !== expectedLive) {
      throw new Error(
        `Connect webhook livemode mismatch: payload claims livemode=${event.livemode} but the ` +
          `signature verified against the ${mode} secret — refusing a cross-mode event.`
      )
    }
    return { event, mode }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Connect webhook signature verification failed for all configured modes')
}

// ========================================
// Connect Webhook Handler
// ========================================

router.post('/webhooks/stripe-connect', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined

  if (!sig) {
    return sendError(res, 'Missing webhook signature', 400)
  }

  // Require at least one mode's Connect secret to be configured.
  if (
    !process.env.STRIPE_CONNECT_WEBHOOK_SECRET &&
    !process.env.STRIPE_TEST_CONNECT_WEBHOOK_SECRET
  ) {
    logger.error(
      'No Connect webhook secret configured (STRIPE_CONNECT_WEBHOOK_SECRET / STRIPE_TEST_CONNECT_WEBHOOK_SECRET)'
    )
    return sendError(res, 'Webhook secret not configured', 500)
  }

  let event: Stripe.Event
  let mode: StripeMode

  try {
    ;({ event, mode } = verifyConnectWebhook(req.body, sig))
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
        await handleAccountUpdated(event.data.object as Stripe.Account, mode === 'test')
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
    // Log internally but always return 200 to Stripe to prevent retries
    // and avoid leaking internal error details
    logger.error(
      'Connect webhook processing error:',
      error instanceof Error ? error : String(error)
    )
    sendSuccess(res, { received: true })
  }
})

// ========================================
// Event Handlers
// ========================================

async function handleAccountUpdated(account: Stripe.Account, isTestMode: boolean): Promise<void> {
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

  // Scope the update to the VERIFIED mode's partition. Webhook requests carry
  // no API key → derivedMode defaults to 'live', which would otherwise force
  // `testModeScopePlugin` to exclude a test ConnectedAccount row (silently
  // dropping a genuine test account.updated). Threading `isTestMode` into the
  // filter overrides the plugin (same pattern as routes/webhooks.ts). HACK E1.5.
  await ConnectedAccount.updateOne({ stripeAccountId: account.id, isTestMode }, update)

  logger.info(
    `Connect account updated: ${account.id} (${isTestMode ? 'test' : 'live'}) → ${status}`
  )
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
