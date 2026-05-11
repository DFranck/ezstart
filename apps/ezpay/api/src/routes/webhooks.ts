import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { getProvider } from '../services/stripe.js'
import { getPaymentModel } from '../models/Payment.js'
import { getPlanModel } from '../models/Plan.js'
import { incrementUsage } from '../services/promo.js'
import {
  notifyEzauthSubscription,
  type SubscriptionWebhookPayload,
} from '../services/ezauth-subscription-webhook.js'
import {
  handlePastDue,
  handleRecovered,
  handleFinalCancellation,
} from '../services/dunning.service.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import type {
  WebhookCheckoutData,
  WebhookRefundData,
  WebhookSubscriptionData,
  WebhookInvoiceData,
} from '@ezstart/pay-sdk/providers'

/**
 * Map Stripe's subscription status enum to the narrowed status accepted by
 * the ezauth subscription webhook receiver. Returns `null` for statuses that
 * should NOT propagate (e.g. `incomplete_expired`, `unpaid`, `paused`).
 */
function mapStripeStatusToEzauth(
  stripeStatus: string
): SubscriptionWebhookPayload['status'] | null {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    case 'incomplete':
      return 'incomplete'
    default:
      return null
  }
}

/**
 * Extract Stripe event id from the provider-wrapped `WebhookEvent`. The
 * pay-sdk Stripe provider exposes the raw Stripe event under `event.raw`,
 * from which we pull the `id` field. Returns `null` if the shape is
 * unexpected so callers can skip idempotent side-effects cleanly.
 */
function extractStripeEventId(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null) return null
  const candidate = (raw as { id?: unknown }).id
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

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
          isTestMode: !eventLiveMode,
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

        // Increment promo usage now that payment is confirmed
        const promoId = data.metadata?.promoId
        if (promoId) {
          try {
            await incrementUsage(promoId)
            logger.info(`Promo usage incremented: ${promoId}`)
          } catch (promoErr) {
            logger.error(
              'Failed to increment promo usage:',
              promoErr instanceof Error ? promoErr : String(promoErr)
            )
          }
        }

        // Cross-service: notify ezauth for subscription checkouts so it can
        // grant roles/features on the user's Application. Fire-and-forget —
        // the Payment row is the source of truth; grants are a side-effect.
        if (data.mode === 'subscription' && data.subscriptionId) {
          try {
            const payment = await Payment.findOne({ paymentId: data.sessionId }).lean()
            const planId = payment?.metadata?.planId
            const userId = payment?.userId

            if (planId && userId) {
              const Plan = await getPlanModel()
              const plan = await Plan.findById(planId).lean()
              const grantsRoles = plan?.metadata?.grantsRoles
              const grantsFeatures = plan?.metadata?.grantsFeatures
              const applicationId = plan?.applicationId
              const stripeEventId = extractStripeEventId(event.raw)

              if (
                applicationId &&
                stripeEventId &&
                ((grantsRoles && grantsRoles.length > 0) ||
                  (grantsFeatures && grantsFeatures.length > 0))
              ) {
                await notifyEzauthSubscription({
                  applicationId,
                  userId,
                  subscriptionId: data.subscriptionId,
                  planId,
                  stripeEventId,
                  status: 'active',
                  grantsRoles,
                  grantsFeatures,
                })
              }
            }
          } catch (notifyErr) {
            logger.warn(
              '[ezauth-webhook] notify on checkout.completed failed (fire-and-forget)',
              notifyErr instanceof Error ? notifyErr : String(notifyErr)
            )
          }
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

        // Snapshot current subscription payment BEFORE the update so we can
        // tell whether the Stripe status actually changed (avoid notifying
        // ezauth for every heartbeat webhook).
        const existingPayment = await Payment.findOne({
          'metadata.subscriptionId': data.subscriptionId,
        }).lean()

        const updateFields: Record<string, unknown> = {
          status: mappedStatus,
          // Persist the raw Stripe subscription status so consumers (e.g.
          // useSubscriptionStatus) can detect `trialing` vs plain `active`.
          'metadata.subscriptionStatus': data.status,
        }

        // Track cancel-at-period-end state
        if (data.cancelAtPeriodEnd !== undefined) {
          updateFields.cancelAtPeriodEnd = data.cancelAtPeriodEnd
        }

        // Track current period end date
        if (data.currentPeriodEnd) {
          updateFields.currentPeriodEnd = new Date(data.currentPeriodEnd * 1000)
        }

        await Payment.updateOne({ 'metadata.subscriptionId': data.subscriptionId }, updateFields)
        logger.info(
          `Subscription updated: ${data.subscriptionId} -> ${mappedStatus}${data.cancelAtPeriodEnd ? ' (canceling at period end)' : ''}`
        )

        // Dunning: if THIS update is the transition into past_due (i.e. the
        // previous metadata.subscriptionStatus was NOT past_due), fire the
        // dunning email + persistent banner. Idempotent — re-firing the same
        // Stripe event re-creates the notification but we always upsert the
        // banner via the SDK component anyway.
        try {
          const prevStatus = existingPayment?.metadata?.subscriptionStatus
          if (data.status === 'past_due' && prevStatus !== 'past_due' && existingPayment) {
            await handlePastDue({
              userId: existingPayment.userId ?? '',
              projectId: existingPayment.projectId,
              customerEmail: existingPayment.customerEmail,
              customerName: existingPayment.customerName,
              planName: (existingPayment.metadata?.planName as string | undefined) ?? undefined,
              subscriptionId: data.subscriptionId,
              isTestMode: !eventLiveMode,
              amount: existingPayment.amount,
              currency: existingPayment.currency,
            })
          }
        } catch (dunErr) {
          logger.warn(
            '[Dunning] handlePastDue on subscription.updated failed (non-fatal)',
            dunErr instanceof Error ? dunErr : String(dunErr)
          )
        }

        // Cross-service: notify ezauth ONLY when the status actually changed.
        // Stripe emits `customer.subscription.updated` on many minor fields
        // (payment method swap, etc.) and we don't want to spam grants.
        try {
          const statusChanged = !existingPayment || existingPayment.status !== mappedStatus
          const ezauthStatus = mapStripeStatusToEzauth(data.status)
          if (statusChanged && ezauthStatus && existingPayment) {
            const planId = existingPayment.metadata?.planId
            const userId = existingPayment.userId

            if (planId && userId) {
              const Plan = await getPlanModel()
              const plan = await Plan.findById(planId).lean()
              const grantsRoles = plan?.metadata?.grantsRoles
              const grantsFeatures = plan?.metadata?.grantsFeatures
              const applicationId = plan?.applicationId
              const stripeEventId = extractStripeEventId(event.raw)

              if (
                applicationId &&
                stripeEventId &&
                ((grantsRoles && grantsRoles.length > 0) ||
                  (grantsFeatures && grantsFeatures.length > 0))
              ) {
                await notifyEzauthSubscription({
                  applicationId,
                  userId,
                  subscriptionId: data.subscriptionId,
                  planId,
                  stripeEventId,
                  status: ezauthStatus,
                  grantsRoles,
                  grantsFeatures,
                  currentPeriodEnd: data.currentPeriodEnd,
                })
              }
            }
          }
        } catch (notifyErr) {
          logger.warn(
            '[ezauth-webhook] notify on subscription.updated failed (fire-and-forget)',
            notifyErr instanceof Error ? notifyErr : String(notifyErr)
          )
        }
        break
      }

      case 'subscription.deleted': {
        const data = event.data as WebhookSubscriptionData

        const existingPayment = await Payment.findOne({
          'metadata.subscriptionId': data.subscriptionId,
        }).lean()

        await Payment.updateOne(
          { 'metadata.subscriptionId': data.subscriptionId },
          { status: 'cancelled' }
        )
        logger.info(`Subscription cancelled: ${data.subscriptionId}`)

        // Dunning: distinguish a "clean cancellation" (user clicked cancel,
        // sub was active) from a "Stripe gave up after dunning" cancellation.
        // The latter happens when the sub was in past_due / failed before
        // being terminated by Smart Retries — that's the case worth a
        // final-cancellation email. Clean cancellations are out of scope
        // here (the consumer app sends its own goodbye, if any).
        try {
          const prevStatus = existingPayment?.metadata?.subscriptionStatus
          const wasDunning = prevStatus === 'past_due' || prevStatus === 'unpaid'
          if (wasDunning && existingPayment) {
            await handleFinalCancellation({
              userId: existingPayment.userId ?? '',
              projectId: existingPayment.projectId,
              customerEmail: existingPayment.customerEmail,
              customerName: existingPayment.customerName,
              planName: (existingPayment.metadata?.planName as string | undefined) ?? undefined,
              subscriptionId: data.subscriptionId,
              isTestMode: !eventLiveMode,
            })
          }
        } catch (dunErr) {
          logger.warn(
            '[Dunning] handleFinalCancellation on subscription.deleted failed (non-fatal)',
            dunErr instanceof Error ? dunErr : String(dunErr)
          )
        }

        // Cross-service: revoke roles/features on ezauth.
        try {
          if (existingPayment) {
            const planId = existingPayment.metadata?.planId
            const userId = existingPayment.userId

            if (planId && userId) {
              const Plan = await getPlanModel()
              const plan = await Plan.findById(planId).lean()
              const grantsRoles = plan?.metadata?.grantsRoles
              const grantsFeatures = plan?.metadata?.grantsFeatures
              const applicationId = plan?.applicationId
              const stripeEventId = extractStripeEventId(event.raw)

              if (
                applicationId &&
                stripeEventId &&
                ((grantsRoles && grantsRoles.length > 0) ||
                  (grantsFeatures && grantsFeatures.length > 0))
              ) {
                await notifyEzauthSubscription({
                  applicationId,
                  userId,
                  subscriptionId: data.subscriptionId,
                  planId,
                  stripeEventId,
                  status: 'canceled',
                  grantsRoles,
                  grantsFeatures,
                })
              }
            }
          }
        } catch (notifyErr) {
          logger.warn(
            '[ezauth-webhook] notify on subscription.deleted failed (fire-and-forget)',
            notifyErr instanceof Error ? notifyErr : String(notifyErr)
          )
        }
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

      case 'invoice.payment_succeeded': {
        const data = event.data as WebhookInvoiceData
        if (!data.subscriptionId) break

        // Skip initial subscription creation (handled by checkout.completed)
        if (data.billingReason === 'subscription_create') {
          logger.info('Skipping initial subscription invoice (handled by checkout.completed)')
          break
        }

        // Find the original subscription payment
        const subPayment = await Payment.findOne({
          'metadata.subscriptionId': data.subscriptionId,
          type: 'subscription',
        }).sort({ createdAt: -1 })

        if (!subPayment) {
          logger.warn(`No subscription payment found for ${data.subscriptionId}`)
          break
        }

        // Dunning recovery detection: if the sub was previously past_due
        // (or its mapped 'pending' / 'failed' status) and this invoice
        // succeeded, fire the recovery flow BEFORE we overwrite the
        // status to 'completed' below.
        const prevSubStatus = subPayment.metadata?.subscriptionStatus
        const wasInDunning = prevSubStatus === 'past_due' || prevSubStatus === 'unpaid'
        if (wasInDunning) {
          try {
            await handleRecovered({
              userId: subPayment.userId ?? '',
              projectId: subPayment.projectId,
              customerEmail: data.customerEmail ?? subPayment.customerEmail,
              customerName: data.customerName ?? subPayment.customerName,
              planName: (subPayment.metadata?.planName as string | undefined) ?? undefined,
              subscriptionId: data.subscriptionId,
              isTestMode: !eventLiveMode,
              amount: (data.amount ?? 0) / 100,
              currency: data.currency ?? subPayment.currency,
            })
          } catch (dunErr) {
            logger.warn(
              '[Dunning] handleRecovered on invoice.payment_succeeded failed (non-fatal)',
              dunErr instanceof Error ? dunErr : String(dunErr)
            )
          }
        }

        // Update the subscription's period end
        await Payment.updateOne(
          { _id: subPayment._id },
          {
            $set: {
              status: 'completed',
              currentPeriodEnd: data.periodEnd,
              cancelAtPeriodEnd: false,
              // Clear the past_due flag so a future recovery cycle is detected
              // correctly (only the next past_due → succeeded transition will
              // re-fire this branch).
              'metadata.subscriptionStatus': 'active',
            },
          }
        )

        // Create a new payment record for this renewal
        await Payment.create({
          projectId: subPayment.projectId,
          projectName: subPayment.projectName,
          type: 'subscription',
          amount: (data.amount || 0) / 100,
          currency: data.currency || subPayment.currency,
          provider: 'stripe',
          paymentId: `renewal-${data.subscriptionId}-${Date.now()}`,
          status: 'completed',
          completedAt: new Date(),
          userId: subPayment.userId,
          customerName: data.customerName || subPayment.customerName,
          customerEmail: data.customerEmail || subPayment.customerEmail,
          isAnonymous: false,
          liveMode: subPayment.liveMode,
          isTestMode: !subPayment.liveMode,
          metadata: {
            subscriptionId: data.subscriptionId,
            billingReason: data.billingReason,
            periodEnd: data.periodEnd,
            renewalOf: subPayment._id.toString(),
          },
        })

        logger.info(`Subscription renewal recorded for ${data.subscriptionId}`)
        break
      }

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`)
    }

    sendSuccess(res, { received: true })
  } catch (error) {
    // Log internally but always return 200 to Stripe to prevent retries
    // and avoid leaking internal error details
    logger.error('Webhook processing error:', error instanceof Error ? error : String(error))
    sendSuccess(res, { received: true })
  }
})

export default router
