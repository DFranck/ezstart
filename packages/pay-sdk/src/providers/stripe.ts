/**
 * Stripe Payment Provider
 * Wraps Stripe SDK behind the IPaymentProvider interface
 *
 * Stripe must be installed by the consuming app (peer dependency).
 * Pass the Stripe instance to the constructor — keeps pay-sdk agnostic.
 */
import type {
  IPaymentProvider,
  CheckoutOptions,
  CheckoutResult,
  SubscriptionCheckoutOptions,
  PaymentVerification,
  RefundResult,
  CancelResult,
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
} from './types.js'

// ========================================
// Minimal Stripe type subset (avoids hard dep on stripe types)
// ========================================

/** Subset of the Stripe SDK instance needed by this provider */
export interface StripeInstance {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<{ id: string; url: string | null }>
      retrieve(id: string): Promise<{
        payment_status: string
        status: string
        payment_method_types?: string[]
      }>
    }
  }
  refunds: {
    create(params: { payment_intent: string }): Promise<{ id: string; status: string | null }>
  }
  subscriptions: {
    cancel(id: string): Promise<{ status: string }>
  }
  webhooks: {
    constructEvent(payload: string | Buffer, signature: string, secret: string): StripeWebhookEvent
  }
}

export interface StripeWebhookEvent {
  type: string
  data: { object: Record<string, unknown> }
}

// ========================================
// Configuration
// ========================================

export interface StripeProviderConfig {
  /** Pre-constructed Stripe SDK instance */
  stripe: StripeInstance
  /** Webhook endpoint secret for signature verification */
  webhookSecret?: string
}

// ========================================
// Provider Implementation
// ========================================

export class StripeProvider implements IPaymentProvider {
  readonly name = 'stripe'
  private stripe: StripeInstance
  private webhookSecret?: string

  constructor(config: StripeProviderConfig) {
    this.stripe = config.stripe
    this.webhookSecret = config.webhookSecret
  }

  // ========================================
  // Checkout
  // ========================================

  async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: { name: options.description },
            unit_amount: Math.round(options.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
    })

    return { sessionId: session.id, url: session.url }
  }

  async createSubscriptionCheckout(options: SubscriptionCheckoutOptions): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: { name: options.description },
            unit_amount: Math.round(options.amount * 100),
            recurring: { interval: options.interval },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
    })

    return { sessionId: session.id, url: session.url }
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId)

    return {
      paid: session.payment_status === 'paid' && session.status === 'complete',
      status: session.payment_status,
      paymentMethod: session.payment_method_types?.[0],
    }
  }

  // ========================================
  // Refunds
  // ========================================

  async refundPayment(paymentIntentId: string): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    })

    return { refundId: refund.id, status: refund.status ?? 'unknown' }
  }

  // ========================================
  // Subscriptions
  // ========================================

  async cancelSubscription(subscriptionId: string): Promise<CancelResult> {
    const subscription = await this.stripe.subscriptions.cancel(subscriptionId)

    return {
      cancelled: subscription.status === 'canceled',
      status: subscription.status,
    }
  }

  // ========================================
  // Webhooks
  // ========================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): WebhookEvent {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured for Stripe provider')
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)

    return mapStripeEvent(event)
  }
}

// ========================================
// Stripe Event Mapping
// ========================================

const STRIPE_EVENT_MAP: Record<string, WebhookEventType> = {
  'checkout.session.completed': 'checkout.completed',
  'checkout.session.expired': 'checkout.expired',
  'charge.refunded': 'payment.refunded',
  'customer.subscription.created': 'subscription.updated',
  'customer.subscription.updated': 'subscription.updated',
  'customer.subscription.deleted': 'subscription.deleted',
  'invoice.payment_failed': 'invoice.payment_failed',
}

function mapStripeEvent(event: StripeWebhookEvent): WebhookEvent {
  const type = STRIPE_EVENT_MAP[event.type] ?? 'unknown'
  const data = extractEventData(type, event)

  return { type, raw: event, data }
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
      }
    case 'invoice.payment_failed':
      return {
        subscriptionId: (obj.subscription as string) ?? null,
      }
    default:
      return {}
  }
}
