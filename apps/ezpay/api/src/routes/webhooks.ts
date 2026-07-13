import { randomUUID } from 'node:crypto'
import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { verifyStripeWebhook } from '../services/stripe.js'
import { getPaymentModel } from '../models/Payment.js'
import { getPlanModel } from '../models/Plan.js'
import { claimWebhookEvent } from '../models/WebhookEvent.js'
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
 * unexpected.
 *
 * Used for (1) the idempotency claim — the `event.id` is the dedup key that
 * guarantees each delivery is processed exactly once — and (2) the
 * cross-service ezauth notification, which forwards `stripeEventId` so the
 * receiver can dedup its own grant side-effects.
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

  let event
  let mode

  try {
    // Signature verification is timing-safe: the Stripe SDK
    // (`stripe.webhooks.constructEvent`, see pay-sdk StripeProvider) computes
    // the HMAC and compares it with a constant-time `crypto.timingSafeEqual`.
    // We NEVER compare signatures with `===` ourselves.
    //
    // Mode-aware (Wave E MED-2 / HACK E1.5): Stripe signs test events with the
    // test secret and live events with the live secret. `verifyStripeWebhook`
    // tries both configured secrets and returns the event PLUS the `mode` of
    // the secret that actually verified the signature. The dataset to write is
    // derived from that VERIFIED mode — never from the payload's self-declared
    // `livemode` (which an attacker holding the test secret could forge to
    // `true` and mutate LIVE data).
    ;({ event, mode } = verifyStripeWebhook(req.body, sig))
  } catch (err) {
    logger.error('Webhook signature verification failed:', err instanceof Error ? err : String(err))
    return sendError(res, 'Invalid signature', 400)
  }

  // The mode dataset is bound to the VERIFYING secret (`mode`), not the
  // payload's `livemode` field — a test-secret-signed event can only ever
  // write test-tagged rows, a live-secret-signed event live rows.
  const eventLiveMode = mode === 'live'
  const eventIsTestMode = !eventLiveMode

  // Idempotency gate — claim the Stripe event id BEFORE running any
  // side-effect. Stripe delivers at-least-once (retries on non-2xx + manual
  // "Resend" in the dashboard), so the same `event.id` can arrive multiple
  // times. The first claim wins; every subsequent delivery short-circuits to
  // a 200 no-op, preventing double promo burns and duplicate renewal Payments.
  const idempotencyKey = extractStripeEventId(event.raw)
  if (idempotencyKey) {
    let firstSeen: boolean
    try {
      // Dedup is scoped by mode — Stripe issues test and live event ids from
      // independent namespaces, so the ledger uniqueness is on
      // `{ eventId, isTestMode }`. This keeps a (theoretical) test/live id
      // collision from one mode short-circuiting the other mode's delivery.
      firstSeen = await claimWebhookEvent(idempotencyKey, {
        provider: 'stripe',
        eventType: event.type,
        isTestMode: eventIsTestMode,
      })
    } catch (claimErr) {
      // The idempotency store is unreachable. Do NOT process blindly (would
      // re-run side-effects on the next retry) and do NOT ack — let Stripe
      // retry once the store recovers.
      logger.error(
        'Webhook idempotency claim failed (store unreachable) — asking Stripe to retry:',
        claimErr instanceof Error ? claimErr : String(claimErr)
      )
      return sendError(res, 'Idempotency store unavailable', 503)
    }

    if (!firstSeen) {
      logger.info(`Duplicate webhook event ignored (already processed): ${idempotencyKey}`)
      return sendSuccess(res, { received: true, duplicate: true })
    }
  } else {
    // No event id on the payload (shape unexpected). We can't dedup — process
    // once and rely on the per-resource unique constraints (paymentId) as a
    // secondary guard. Logged so the gap is visible in observability.
    logger.warn('Webhook event has no extractable id — idempotency dedup skipped')
  }

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

        // Stamp the Stripe customer id so downstream `subscription.updated`
        // webhooks can look this Payment up via the customer fallback when
        // events arrive out of order (before `metadata.subscriptionId` is
        // stamped). Populated for every subscription checkout by Stripe.
        if (data.customerId) {
          updateData.stripeCustomerId = data.customerId
        }

        // isTestMode in the filter overrides testModeScopePlugin: webhook
        // requests carry no API key so derivedMode defaults to 'live', which
        // would otherwise exclude test payments from the query.
        const result = await Payment.updateOne(
          { paymentId: data.sessionId, isTestMode: !eventLiveMode },
          updateData
        )

        if (result.matchedCount === 0) {
          logger.error(`Payment not found in DB: ${data.sessionId}`)
        } else {
          logger.info(`Payment completed: ${data.sessionId}`)
        }

        // Increment promo usage now that payment is confirmed. The increment
        // is atomic (check-and-$inc in one op) so it cannot exceed maxUses even
        // under concurrent webhook deliveries — and the per-event idempotency
        // gate above already prevents this exact event from burning twice.
        const promoId = data.metadata?.promoId
        if (promoId) {
          try {
            const claimed = await incrementUsage(promoId)
            if (claimed) {
              logger.info(`Promo usage incremented: ${promoId}`)
            } else {
              // Promo already at its usage limit. The payment still completes
              // (the user paid); we only log the over-redemption attempt.
              logger.warn(
                `Promo usage NOT incremented — already at limit: ${promoId} (payment ${data.sessionId})`
              )
            }
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
            const payment = await Payment.findOne({
              paymentId: data.sessionId,
              isTestMode: !eventLiveMode,
            }).lean()
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
        await Payment.updateOne(
          { paymentId: data.sessionId, isTestMode: !eventLiveMode },
          { status: 'cancelled' }
        )
        logger.info(`Payment expired: ${data.sessionId}`)
        break
      }

      case 'payment.refunded': {
        const data = event.data as WebhookRefundData
        await Payment.updateOne(
          { stripePaymentIntentId: data.paymentIntentId, isTestMode: !eventLiveMode },
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
        let existingPayment = await Payment.findOne({
          'metadata.subscriptionId': data.subscriptionId,
          isTestMode: !eventLiveMode,
        }).lean()

        // Resilience — Stripe delivery order is not guaranteed. When
        // `customer.subscription.updated` fires BEFORE `checkout.completed`
        // has stamped `metadata.subscriptionId` on the originating Payment
        // row, the query above misses. Recover by joining on the Stripe
        // customer id (captured on the checkout Session) + `status:
        // 'pending' + type: 'subscription' + no existing subscriptionId` —
        // that uniquely identifies the originating checkout row for this
        // subscription. We use `findOneAndUpdate` atomic to avoid a
        // lost-update race when two webhook deliveries arrive concurrently
        // (each finding the same pending Payment then racing on the write).
        if (!existingPayment && data.customerId) {
          const claimed = await Payment.findOneAndUpdate(
            {
              stripeCustomerId: data.customerId,
              status: 'pending',
              type: 'subscription',
              isTestMode: !eventLiveMode,
              // Filter out rows that already have a subscriptionId — this
              // means another delivery already claimed them. This is what
              // makes the operation truly atomic under concurrent claims.
              $or: [
                { 'metadata.subscriptionId': { $exists: false } },
                { 'metadata.subscriptionId': null },
                { 'metadata.subscriptionId': '' },
              ],
            },
            {
              $set: {
                'metadata.subscriptionId': data.subscriptionId,
                'metadata.subscriptionStatus': data.status,
              },
            },
            {
              sort: { createdAt: -1 },
              new: true,
            }
          ).lean()

          if (claimed) {
            logger.info(
              `Subscription ${data.subscriptionId} linked via customer fallback to Payment ${String(claimed._id)}`
            )
            existingPayment = claimed
          } else {
            logger.info(
              `Subscription ${data.subscriptionId} — no pending Payment matched customer fallback (already claimed or absent)`
            )
          }
        }

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

        await Payment.updateOne(
          { 'metadata.subscriptionId': data.subscriptionId, isTestMode: !eventLiveMode },
          updateFields
        )
        logger.info(
          `Subscription updated: ${data.subscriptionId} -> ${mappedStatus}${data.cancelAtPeriodEnd ? ' (canceling at period end)' : ''}`
        )

        // Dunning: if THIS update is the transition into past_due (i.e. the
        // previous metadata.subscriptionStatus was NOT past_due), fire the
        // dunning email + persistent banner. A redelivery of the SAME Stripe
        // event never reaches here (the event.id idempotency gate at the top
        // short-circuits it); the transition guard below additionally prevents
        // a distinct event re-firing when the status hasn't actually changed.
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
          isTestMode: !eventLiveMode,
        }).lean()

        await Payment.updateOne(
          { 'metadata.subscriptionId': data.subscriptionId, isTestMode: !eventLiveMode },
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
            { 'metadata.subscriptionId': data.subscriptionId, isTestMode: !eventLiveMode },
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
          isTestMode: !eventLiveMode,
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
          { _id: subPayment._id, isTestMode: !eventLiveMode },
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

        // Amount reconciliation: trust the amount Stripe reports on the
        // invoice, NOT a server-side pre-computed figure. If the renewal
        // amount diverges from the original subscription's amount (price
        // change, proration, tax shift), persist the real Stripe value and
        // surface the divergence for observability.
        const renewalAmount = (data.amount ?? 0) / 100
        if (renewalAmount > 0 && Math.abs(renewalAmount - subPayment.amount) > 0.01) {
          logger.warn(
            `Subscription renewal amount diverges from original for ${data.subscriptionId}: ` +
              `original=${subPayment.amount} renewal=${renewalAmount} (persisting Stripe value)`
          )
        }

        // Create a new payment record for this renewal. The paymentId uses a
        // random UUID (not Date.now(), which collides within the same ms and
        // would let the unique index pass a duplicate renewal through). The
        // unique `paymentId` index is now a real second line of defence
        // against duplicate renewals on top of the per-event idempotency gate.
        await Payment.create({
          projectId: subPayment.projectId,
          projectName: subPayment.projectName,
          type: 'subscription',
          amount: renewalAmount,
          currency: data.currency || subPayment.currency,
          provider: 'stripe',
          paymentId: `renewal-${data.subscriptionId}-${randomUUID()}`,
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
