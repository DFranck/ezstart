// Core pay client — exposes the factory as the public API; the underlying
// class is exported as a TYPE ONLY so consumers can annotate variables
// without instantiating it directly. Use `createPayClient(config)` to build
// instances.
export { createPayClient } from './pay-client.js'
export type { PayClient } from './pay-client.js'

// Types
export type {
  PayClientConfig,
  LegacyPayClientConfig,
  ApplicationConfigResponse,
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
  PlanMetadata,
  CreatePlanRequest,
  UpdatePlanRequest,
  ChangePlanRequest,
  ChangePlanResponse,
  GetPaymentsParams,
  PlanResponse,
  PlansListResponse,
  PayApiKeyItem,
  CreatePayApiKeyRequest,
  CreatePayApiKeyResponse,
  PayApiKeyUsageResponse,
  BillingPortalResponse,
  BillingPortalRequest,
  SubscriptionStatusSnapshot,
} from './types.js'

// Subscription status derivation (shared between client hook + server companion)
export {
  deriveSubscriptionStatus,
  EMPTY_SUBSCRIPTION_SNAPSHOT,
} from './derive-subscription-status.js'

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

// Errors — typed PayError + parsers (agnostic, replaces @ezstart/api-sdk's parseApiError)
export { PayError, parsePayError, parsePayErrorCode, payErrorFromResponse } from './errors.js'
export type { PayErrorDetail } from './errors.js'

// Utils
export { formatCurrency, getCurrencySymbol } from './format-currency.js'

// Env-aware URL defaults (Phase A2 2026-05-10)
export {
  DEFAULT_PAY_API_URL,
  EZPAY_URLS_BY_ENV,
  detectPayEnvironment,
  getEzpayDefaultUrls,
} from './defaults.js'
export type { PayEnvironment } from './defaults.js'

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
