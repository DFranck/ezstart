// Barrel re-export for all pay-sdk core types.
// Grouped by domain: common (config), payments, promos, plans, connect, billing, api-keys.

export type { PayClientConfig, LegacyPayClientConfig, ApplicationConfigResponse } from './common.js'

export type {
  PaymentType,
  PaymentStatus,
  PaymentProvider,
  Payment,
  Donation,
  Purchase,
  Subscription,
  Invoice,
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  ChangePlanRequest,
  ChangePlanResponse,
  GetPaymentsParams,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
} from './payments.js'

export type {
  PromoDiscountType,
  PromoDuration,
  Promo,
  CreatePromoRequest,
  UpdatePromoRequest,
  PromoValidationResponse,
  PromoResponse,
  PromosListResponse,
} from './promos.js'

export type {
  PlanMetadata,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanResponse,
  PlansListResponse,
} from './plans.js'

export type {
  ConnectAccountType,
  ConnectAccountStatus,
  ConnectedAccount,
  ConnectStatusResponse,
  ConnectOnboardRequest,
  ConnectConvertRequest,
  ConnectOnboardResponse,
  ConnectDashboardLinkResponse,
  ConnectResumeRequest,
  ConnectResumeResponse,
} from './connect.js'

export type { BillingPortalResponse, BillingPortalRequest } from './billing.js'

export type {
  PayApiKeyItem,
  CreatePayApiKeyRequest,
  CreatePayApiKeyResponse,
  PayApiKeyUsageResponse,
} from './api-keys.js'
