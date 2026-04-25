/**
 * Maps a raw Stripe webhook event (`stripe.webhooks.constructEvent` output)
 * into the provider-agnostic `WebhookEvent` shape used across pay-sdk.
 *
 * Extracted from `stripe.ts` so the new `verifyWebhookSignature` helper in
 * `core/verify-webhook-signature.ts` can reuse the same logic without
 * instantiating a full `StripeProvider`.
 */

import type { StripeWebhookEvent } from './stripe.js'
import type { WebhookEvent, WebhookEventData, WebhookEventType } from './types.js'

const STRIPE_EVENT_MAP: Record<string, WebhookEventType> = {
  'checkout.session.completed': 'checkout.completed',
  'checkout.session.expired': 'checkout.expired',
  'charge.refunded': 'payment.refunded',
  'customer.subscription.created': 'subscription.updated',
  'customer.subscription.updated': 'subscription.updated',
  'customer.subscription.deleted': 'subscription.deleted',
  'invoice.payment_failed': 'invoice.payment_failed',
  'invoice.payment_succeeded': 'invoice.payment_succeeded',
}

export function mapStripeWebhookEvent(event: StripeWebhookEvent): WebhookEvent {
  const type = STRIPE_EVENT_MAP[event.type] ?? 'unknown'
  const data = extractEventData(type, event)

  return { type, livemode: event.livemode ?? false, raw: event, data }
}

function extractEventData(type: WebhookEventType, event: StripeWebhookEvent): WebhookEventData {
  const obj = event.data.object

  switch (type) {
    case 'checkout.completed':
    case 'checkout.expired':
      return {
        sessionId: obj.id as string,
        paymentIntentId: (obj.payment_intent as string) ?? undefined,
        subscriptionId: (obj.subscription as string) ?? undefined,
        paymentMethod: (obj.payment_method_types as string[])?.[0],
        mode: (obj.mode as 'payment' | 'subscription') ?? 'payment',
        metadata: (obj.metadata as Record<string, string>) ?? undefined,
      }
    case 'payment.refunded':
      return {
        paymentIntentId: obj.payment_intent as string,
      }
    case 'subscription.updated':
    case 'subscription.deleted':
      return {
        subscriptionId: obj.id as string,
        status: obj.status as string,
        cancelAtPeriodEnd: (obj.cancel_at_period_end as boolean) ?? undefined,
        currentPeriodEnd: (obj.current_period_end as number) ?? undefined,
      }
    case 'invoice.payment_failed':
      return {
        subscriptionId: (obj.subscription as string) ?? null,
      }
    case 'invoice.payment_succeeded': {
      const sub = obj.subscription
      return {
        subscriptionId:
          typeof sub === 'string'
            ? sub
            : (((sub as Record<string, unknown>)?.id as string) ?? null),
        amount: obj.amount_paid as number | undefined,
        currency: obj.currency as string | undefined,
        billingReason: obj.billing_reason as string | undefined,
        periodEnd: obj.period_end
          ? new Date((obj.period_end as number) * 1000).toISOString()
          : undefined,
        customerEmail: obj.customer_email as string | undefined,
        customerName: obj.customer_name as string | undefined,
      }
    }
    default:
      return {}
  }
}
