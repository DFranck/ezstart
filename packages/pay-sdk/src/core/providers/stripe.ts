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
  ConnectParams,
  SubscriptionCheckoutOptions,
  PaymentVerification,
  RefundResult,
  CancelResult,
  WebhookEvent,
  DiscountInfo,
} from './types.js'
import { mapStripeWebhookEvent } from './stripe-event-mapper.js'

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
  coupons: {
    create(params: Record<string, unknown>): Promise<{ id: string }>
  }
  refunds: {
    create(params: { payment_intent: string }): Promise<{ id: string; status: string | null }>
  }
  subscriptions: {
    cancel(id: string): Promise<{ status: string }>
    update(
      id: string,
      params: Record<string, unknown>
    ): Promise<{ status: string; cancel_at_period_end: boolean; current_period_end: number }>
  }
  webhooks: {
    constructEvent(payload: string | Buffer, signature: string, secret: string): StripeWebhookEvent
  }
}

export interface StripeWebhookEvent {
  type: string
  livemode: boolean
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
    // For one-time purchases, apply discount directly to the amount
    let unitAmount = Math.round(options.amount * 100)
    if (options.discount) {
      unitAmount = this.applyDiscountToAmount(unitAmount, options.discount)
    }

    // Build payment_intent_data with optional Connect params
    const paymentIntentData: Record<string, unknown> = {}
    if (options.customerEmail) {
      paymentIntentData.receipt_email = options.customerEmail
    }
    if (options.connect) {
      // One-shot payments use `application_fee_amount` (cents).
      if (typeof options.connect.applicationFeeAmount === 'number') {
        paymentIntentData.application_fee_amount = options.connect.applicationFeeAmount
      }
      paymentIntentData.transfer_data = { destination: options.connect.destinationAccountId }
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: { name: options.description },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
      ...(options.automaticTax
        ? {
            automatic_tax: { enabled: true },
            // Collect VAT IDs for B2B reverse-charge exemption (validated via VIES).
            tax_id_collection: { enabled: true },
            // Stripe requires `customer_update` whenever `automatic_tax` is on
            // and a Customer already exists — `auto` lets Stripe sync the address
            // collected at checkout back to the Customer for tax recomputation.
            customer_update: { shipping: 'auto', address: 'auto' },
          }
        : {}),
      ...(Object.keys(paymentIntentData).length > 0
        ? { payment_intent_data: paymentIntentData }
        : {}),
    })

    return { sessionId: session.id, url: session.url }
  }

  async createSubscriptionCheckout(options: SubscriptionCheckoutOptions): Promise<CheckoutResult> {
    // For subscriptions, use Stripe native coupons to handle discount duration properly
    let discountsParam: Record<string, unknown>[] | undefined
    if (options.discount) {
      const coupon = await this.createStripeCoupon(options.discount, options.currency)
      discountsParam = [{ coupon: coupon.id }]
    }

    const unitAmount = Math.round(options.amount * 100) // FULL price in cents, coupon handles discount

    // Build subscription_data with optional Connect params + trial
    const subscriptionData: Record<string, unknown> = {}
    if (options.connect) {
      const feePercent = resolveApplicationFeePercent(options.connect, unitAmount)
      if (feePercent !== undefined) {
        subscriptionData.application_fee_percent = feePercent
      }
      subscriptionData.transfer_data = { destination: options.connect.destinationAccountId }
    }
    if (typeof options.trialPeriodDays === 'number' && options.trialPeriodDays > 0) {
      subscriptionData.trial_period_days = options.trialPeriodDays
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: { name: options.description },
            unit_amount: unitAmount,
            recurring: {
              interval: 'month',
              interval_count: options.intervalCount ?? 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      ...(discountsParam ? { discounts: discountsParam } : {}),
      ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
      ...(options.automaticTax
        ? {
            automatic_tax: { enabled: true },
            // Collect VAT IDs for B2B reverse-charge exemption (validated via VIES).
            tax_id_collection: { enabled: true },
            // Stripe requires `customer_update` whenever `automatic_tax` is on
            // and a Customer already exists — `auto` lets Stripe sync the address
            // collected at checkout back to the Customer for tax recomputation.
            customer_update: { shipping: 'auto', address: 'auto' },
          }
        : {}),
      ...(Object.keys(subscriptionData).length > 0 ? { subscription_data: subscriptionData } : {}),
    })

    return { sessionId: session.id, url: session.url }
  }

  // ========================================
  // Discount Helpers
  // ========================================

  /**
   * Create a Stripe Coupon from DiscountInfo.
   * Used for subscription checkouts where Stripe must manage discount duration.
   */
  private async createStripeCoupon(
    discount: DiscountInfo,
    currency: string
  ): Promise<{ id: string }> {
    const params: Record<string, unknown> = {
      duration: discount.duration,
    }

    if (discount.type === 'percent') {
      params.percent_off = discount.value
    } else {
      params.amount_off = discount.value
      params.currency = currency.toLowerCase()
    }

    if (discount.duration === 'repeating' && discount.durationInMonths) {
      params.duration_in_months = discount.durationInMonths
    }

    return this.stripe.coupons.create(params)
  }

  /**
   * Apply discount directly to amount (for one-time payments).
   * Returns the discounted amount in cents, minimum 0.
   */
  private applyDiscountToAmount(amountInCents: number, discount: DiscountInfo): number {
    if (discount.type === 'percent') {
      return Math.max(0, Math.round(amountInCents * (1 - discount.value / 100)))
    }
    // Fixed discount: value is already in minor units (cents)
    return Math.max(0, amountInCents - discount.value)
  }

  // ========================================
  // Verification
  // ========================================

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
    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    return {
      cancelled: subscription.cancel_at_period_end === true,
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

    return mapStripeWebhookEvent(event)
  }
}

// ========================================
// Connect Fee Helpers
// ========================================

/**
 * Resolve the `application_fee_percent` value for a subscription checkout.
 *
 * Rules:
 * - If `applicationFeePercent` is provided, validate it is in [0, 100] and round to 2 decimals.
 * - Otherwise, if `applicationFeeAmount` is provided (legacy), compute
 *   `(applicationFeeAmount / unitAmountInCents) * 100` rounded to 2 decimals.
 * - If neither is provided, return `undefined` (no platform fee).
 *
 * @throws Error if `applicationFeePercent` is out of range [0, 100].
 * @throws Error if the derived fee percent from legacy amount is out of range.
 * @internal
 */
export function resolveApplicationFeePercent(
  connect: ConnectParams,
  unitAmountInCents: number
): number | undefined {
  if (typeof connect.applicationFeePercent === 'number') {
    return validateAndRoundFeePercent(connect.applicationFeePercent, 'applicationFeePercent')
  }

  if (typeof connect.applicationFeeAmount === 'number') {
    if (unitAmountInCents <= 0) {
      throw new Error(
        'Cannot derive application_fee_percent from applicationFeeAmount when unit amount is zero or negative. ' +
          'Pass applicationFeePercent explicitly for subscriptions.'
      )
    }
    const derived = (connect.applicationFeeAmount / unitAmountInCents) * 100
    return validateAndRoundFeePercent(derived, 'derived applicationFeePercent')
  }

  return undefined
}

function validateAndRoundFeePercent(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${label}: must be a finite number, got ${value}`)
  }
  if (value < 0 || value > 100) {
    throw new Error(`Invalid ${label}: must be between 0 and 100 (inclusive), got ${value}`)
  }
  // Stripe accepts up to 2 decimals on application_fee_percent.
  return Math.round(value * 100) / 100
}
