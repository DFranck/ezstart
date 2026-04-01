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
// Checkout Types
// ========================================

export interface CheckoutOptions {
  amount: number
  currency: string
  description: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface SubscriptionCheckoutOptions extends CheckoutOptions {
  interval: 'month' | 'year'
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
  | 'unknown'

export interface WebhookEvent {
  type: WebhookEventType
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
}

export interface WebhookRefundData {
  paymentIntentId: string
}

export interface WebhookSubscriptionData {
  subscriptionId: string
  status: string
}

export interface WebhookInvoiceData {
  subscriptionId: string | null
}

export type WebhookEventData =
  | WebhookCheckoutData
  | WebhookRefundData
  | WebhookSubscriptionData
  | WebhookInvoiceData
  | Record<string, unknown>
