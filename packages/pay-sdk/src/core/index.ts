// Core pay client
export { PayClient, createPayClient } from './pay-client.js'

// Types
export type {
  PayClientConfig,
  LegacyPayClientConfig,
  Payment,
  Donation,
  Purchase,
  Subscription,
  Invoice,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
  Promo,
  PromoDiscountType,
  PromoDuration,
  CreatePromoRequest,
  UpdatePromoRequest,
  PromoResponse,
  PromosListResponse,
  PromoValidationResponse,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanResponse,
  PlansListResponse,
  PayApiKeyItem,
  CreatePayApiKeyRequest,
  CreatePayApiKeyResponse,
  PayApiKeyUsageResponse,
} from './types.js'

// Schemas
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
  promoDiscountTypeSchema,
  promoDurationSchema,
  createPromoSchema,
  updatePromoSchema,
  promoResponseSchema,
  promoValidationResponseSchema,
  planIntervalSchema,
  createPlanSchema,
  updatePlanSchema,
  planResponseSchema,
} from './schemas.js'

// Utils
export { formatCurrency, getCurrencySymbol } from './format-currency.js'

// Providers
export { PaymentProviderRegistry } from './providers/registry.js'
export { StripeProvider } from './providers/stripe.js'
export { ConsoleProvider } from './providers/console.js'
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
} from './providers/types.js'
export type { StripeProviderConfig, StripeInstance } from './providers/stripe.js'
