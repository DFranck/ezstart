// Backward-compat barrel — the type definitions now live in `./types/<domain>.ts`.
// New code should import from the domain-specific files (or `./types/index.js`)
// directly; this file is kept to avoid breaking changes for consumers that
// imported from `./types.js` pre-split.
export type {
  // common
  PayClientConfig,
  LegacyPayClientConfig,
  ApplicationConfigResponse,
  // payments
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
  // promos
  PromoDiscountType,
  PromoDuration,
  Promo,
  CreatePromoRequest,
  UpdatePromoRequest,
  PromoValidationResponse,
  PromoResponse,
  PromosListResponse,
  // plans
  PlanMetadata,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanResponse,
  PlansListResponse,
  // connect
  ConnectAccountType,
  ConnectAccountStatus,
  ConnectedAccount,
  ConnectStatusResponse,
  ConnectOnboardRequest,
  ConnectConvertRequest,
  ConnectOnboardResponse,
  ConnectDashboardLinkResponse,
  // billing portal
  BillingPortalResponse,
  BillingPortalRequest,
  SubscriptionStatusSnapshot,
  // api keys
  PayApiKeyItem,
  CreatePayApiKeyRequest,
  CreatePayApiKeyResponse,
  PayApiKeyUsageResponse,
} from './types/index.js'
