/**
 * Payment Providers — provider-agnostic payment abstraction
 */

// Types
export type {
  IPaymentProvider,
  PaymentProviderConfig,
  DiscountInfo,
  CheckoutOptions,
  CheckoutResult,
  SubscriptionCheckoutOptions,
  PaymentVerification,
  RefundResult,
  CancelResult,
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  WebhookCheckoutData,
  WebhookRefundData,
  WebhookSubscriptionData,
  WebhookInvoiceData,
} from './types.js'

// Registry
export { PaymentProviderRegistry } from './registry.js'

// Providers
export { StripeProvider } from './stripe.js'
export type { StripeProviderConfig, StripeInstance } from './stripe.js'
export { ConsoleProvider } from './console.js'
