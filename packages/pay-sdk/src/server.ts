/**
 * Server-safe exports for @ezstart/pay-sdk
 * These can be imported in Node.js / API routes without pulling in React dependencies
 */

// Types
export type {
  Payment,
  Donation,
  Purchase,
  Subscription,
  Invoice,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
  PayClientConfig,
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
} from './core/types.js'

// Zod schemas for validation and OpenAPI
export {
  paymentStatusSchema,
  paymentTypeSchema,
  paymentProviderSchema,
  basePaymentSchema,
  createDonationSchema,
  createPurchaseSchema,
  createSubscriptionSchema,
  paymentResponseSchema,
  paymentsListResponseSchema,
  statsResponseSchema,
  errorResponseSchema,
} from './core/schemas.js'

// Providers (provider-agnostic payment abstraction)
export { PaymentProviderRegistry, StripeProvider, ConsoleProvider } from './core/providers/index.js'
export type {
  IPaymentProvider,
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
  StripeProviderConfig,
  StripeInstance,
} from './core/providers/index.js'

// Webhook signature verification (provider-agnostic helper)
export { verifyWebhookSignature } from './core/verify-webhook-signature.js'
export type { VerifyWebhookSignatureOptions } from './core/verify-webhook-signature.js'
