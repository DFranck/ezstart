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
  /** Platform fee in minor currency units (cents) */
  applicationFeeAmount: number
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
}

export interface SubscriptionCheckoutOptions extends CheckoutOptions {
  interval: 'month'
  intervalCount?: number
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
