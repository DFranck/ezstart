/**
 * Payment Provider Abstraction
 * Same pattern as ai-sdk: provider interface + registry
 */

// ========================================
// Provider Configuration
// ========================================

export interface PaymentProviderConfig {
  name: string
  secretKey: string
  webhookSecret?: string
  testMode?: boolean
}

// ========================================
// Provider Interface
// ========================================

export interface IPaymentProvider {
  /** Provider identifier (e.g. 'stripe', 'paypal') */
  name: string

  // Checkout
  createCheckoutSession(options: CheckoutOptions): Promise<CheckoutResult>
  createSubscriptionCheckout(options: SubscriptionCheckoutOptions): Promise<CheckoutResult>
  verifyPayment(sessionId: string): Promise<PaymentVerification>

  // Refunds
  refundPayment(paymentIntentId: string): Promise<RefundResult>

  // Subscriptions
  cancelSubscription(subscriptionId: string): Promise<CancelResult>

  // Webhooks
  verifyWebhookSignature(payload: string | Buffer, signature: string): WebhookEvent
}

// ========================================
// Discount Types
// ========================================

export interface DiscountInfo {
  type: 'percent' | 'fixed'
  value: number // 20 for 20%, or 500 for $5.00
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number
  code?: string // the promo code for reference
}

// ========================================
// Checkout Types
// ========================================

export interface ConnectParams {
  /** Stripe connected account ID (acct_xxx) — destination for the payment */
  destinationAccountId: string
  /**
   * Platform fee in minor currency units (cents).
   *
   * - One-shot payments (`createCheckoutSession`): used as `application_fee_amount` (cents).
   * - Subscriptions (`createSubscriptionCheckout`): used as LEGACY fallback only. The provider
   *   computes a percent from `applicationFeeAmount / unitAmountInCents`. Prefer
   *   `applicationFeePercent` for subscriptions.
   */
  applicationFeeAmount?: number
  /**
   * Platform fee percentage (0-100, up to 2 decimals).
   *
   * Used exclusively for subscriptions (`application_fee_percent`). Ignored for one-shots.
   * Prefer this over `applicationFeeAmount` for recurring charges, since Stripe's
   * `application_fee_percent` is a percent — not a cents amount.
   */
  applicationFeePercent?: number
  /** Account type: standard (full dashboard) or express (simplified onboarding) */
  accountType?: 'standard' | 'express'
}

export interface CheckoutOptions {
  amount: number
  currency: string
  description: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  discount?: DiscountInfo
  /** Stripe Connect params — routes payment to a connected account with platform fee */
  connect?: ConnectParams
  /**
   * Enable Stripe automatic tax calculation on the Checkout Session.
   *
   * When `true`, the provider sets:
   *   - `automatic_tax: { enabled: true }` — Stripe Tax computes VAT/sales tax based
   *     on the customer's billing/shipping address.
   *   - `tax_id_collection: { enabled: true }` — Stripe Checkout collects + validates
   *     the customer's VAT ID via VIES (B2B reverse-charge exemption in EU).
   *   - `customer_update: { shipping: 'auto', address: 'auto' }` — required by
   *     Stripe whenever `automatic_tax` is on and a `Customer` already exists, so
   *     Stripe can sync the collected address back to the Customer for accurate
   *     tax recomputation on subsequent invoices.
   *
   * Requires Stripe Tax to be configured in the Stripe Dashboard
   * (Settings → Tax) — otherwise Stripe rejects the request at checkout time.
   * See `apps/ezpay/STRIPE_TAX_SETUP.md` for the one-time setup walkthrough.
   *
   * Defaults to `false` when omitted to preserve backwards compatibility.
   */
  automaticTax?: boolean
}

export interface SubscriptionCheckoutOptions extends CheckoutOptions {
  interval: 'month'
  intervalCount?: number
  /**
   * Free-trial duration in days applied to the subscription created by this
   * checkout (`subscription_data.trial_period_days`). Range: 1-730 per Stripe.
   * Omit / `0` disables the trial.
   */
  trialPeriodDays?: number
}

export interface CheckoutResult {
  sessionId: string
  url: string | null
}

// ========================================
// Verification Types
// ========================================

export interface PaymentVerification {
  paid: boolean
  status: string
  paymentMethod?: string
}

// ========================================
// Refund Types
// ========================================

export interface RefundResult {
  refundId: string
  status: string
}

// ========================================
// Subscription Types
// ========================================

export interface CancelResult {
  cancelled: boolean
  status: string
}

// ========================================
// Webhook Types
// ========================================

export type WebhookEventType =
  | 'checkout.completed'
  | 'checkout.expired'
  | 'payment.refunded'
  | 'subscription.updated'
  | 'subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded'
  | 'unknown'

export interface WebhookEvent {
  type: WebhookEventType
  /** Whether this event comes from a live (production) Stripe environment */
  livemode: boolean
  /** Provider-specific raw event object */
  raw: unknown
  /** Parsed data depending on event type */
  data: WebhookEventData
}

export interface WebhookCheckoutData {
  sessionId: string
  paymentIntentId?: string
  subscriptionId?: string
  /**
   * Stripe customer id (`cus_…`) attached to the Checkout Session. Populated
   * for every session that resulted in a persisted customer (subscription
   * mode always creates one; payment mode does when `customer_email` +
   * `customer_creation: 'always'` were passed). Consumers persist this on
   * their local Payment row so downstream webhooks can look up the
   * originating Payment via `stripeCustomerId` when the
   * `metadata.subscriptionId` join key hasn't been stamped yet.
   */
  customerId?: string
  paymentMethod?: string
  mode: 'payment' | 'subscription'
  /** Session metadata passed when creating the checkout */
  metadata?: Record<string, string>
}

export interface WebhookRefundData {
  paymentIntentId: string
}

export interface WebhookSubscriptionData {
  subscriptionId: string
  status: string
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: number
  /**
   * Stripe customer id (`cus_…`) on the subscription. Used by the ezpay
   * webhook resilience path — when `metadata.subscriptionId` hasn't been
   * stamped yet on the local Payment row (delivery arrived out of order),
   * the handler falls back to `stripeCustomerId + status: 'pending'` to
   * locate the originating checkout and stamp the join key inline.
   */
  customerId?: string
}

export interface WebhookInvoiceData {
  subscriptionId: string | null
  amount?: number
  currency?: string
  billingReason?: string
  periodEnd?: string
  customerEmail?: string
  customerName?: string
}

export type WebhookEventData =
  | WebhookCheckoutData
  | WebhookRefundData
  | WebhookSubscriptionData
  | WebhookInvoiceData
  | Record<string, unknown>
