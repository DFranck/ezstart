// Payment Types
export type PaymentType = 'donation' | 'purchase' | 'subscription' | 'invoice' | 'testimonial'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

export type PaymentProvider = 'stripe' | 'paypal'

// Base Payment
export interface Payment {
  id: string
  projectId: string
  projectName: string
  type: PaymentType
  amount: number
  currency: string
  provider: PaymentProvider
  paymentId: string
  paymentMethod?: string
  status: PaymentStatus
  userId?: string
  customerName?: string
  customerEmail?: string
  isAnonymous: boolean
  liveMode: boolean
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  completedAt?: string
}

// Donation specific
export interface Donation extends Payment {
  type: 'donation'
  metadata: {
    message?: string
    isPublic?: boolean
  }
}

// Purchase specific
export interface Purchase extends Payment {
  type: 'purchase'
  metadata: {
    productId: string
    productName: string
    quantity: number
  }
}

// Subscription specific
export interface Subscription extends Payment {
  type: 'subscription'
  metadata: {
    subscriptionId: string
    planId: string
    planName: string
    interval: 'month'
    intervalCount: number
    features?: string[]
  }
}

// Invoice specific
export interface Invoice extends Payment {
  type: 'invoice'
  metadata: {
    invoiceId: string
    invoiceNumber: string
  }
}

// Client Config — agnostic, no @ezstart/* deps
export interface PayClientConfig {
  /** Base API URL (e.g. "https://api.example.com/api") */
  apiUrl: string
  appName: string
  /** Explicit return URL for payment redirects. Falls back to window.location origin. */
  returnUrl?: string
  /** Optional API key for server-to-server authentication (sent as `X-API-Key` header). */
  apiKey?: string
  /** Optional callback to retrieve the current auth token dynamically.
   *  When provided, the token is sent as `Authorization: Bearer <token>` on every request. */
  getToken?: () => string | null | undefined
  /** Optional callback to refresh the auth token when a 401 is received.
   *  Should return the new access token, or null if refresh failed. */
  onTokenRefresh?: () => Promise<string | null>
  /** Optional callback invoked when token refresh fails (e.g. to trigger logout/redirect). */
  onAuthFailure?: () => void
}

/**
 * @deprecated Use `PayClientConfig` with `apiUrl` instead. Kept for backward compat.
 */
export interface LegacyPayClientConfig {
  baseURL?: string
  appName: string
  returnUrl?: string
  getToken?: () => string | null | undefined
  onTokenRefresh?: () => Promise<string | null>
  onAuthFailure?: () => void
}

// Promo Types
export type PromoDiscountType = 'percent' | 'fixed'

export type PromoDuration = 'once' | 'repeating' | 'forever'

export interface Promo {
  id: string
  code: string
  appName: string
  discountType: PromoDiscountType
  discountValue: number
  currency?: string
  duration: PromoDuration
  durationInMonths?: number
  maxUses?: number
  usedCount: number
  active: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePromoRequest {
  code: string
  appName: string
  discountType: PromoDiscountType
  discountValue: number
  currency?: string
  duration: PromoDuration
  durationInMonths?: number
  maxUses?: number
  active?: boolean
  expiresAt?: string
}

export interface UpdatePromoRequest {
  discountType?: PromoDiscountType
  discountValue?: number
  currency?: string
  duration?: PromoDuration
  durationInMonths?: number
  maxUses?: number | null
  active?: boolean
  expiresAt?: string | null
}

export interface PromoValidationResponse {
  success: boolean
  data: {
    valid: boolean
    reason?: string
    discountType?: PromoDiscountType
    discountValue?: number
    currency?: string
    duration?: PromoDuration
  }
}

export interface PromoResponse {
  success: boolean
  data: {
    promo: Promo
  }
}

export interface PromosListResponse {
  success: boolean
  data: Promo[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// Plan Types
export interface Plan {
  id: string
  name: string
  appName: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  sortOrder: number
  stripePriceId?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePlanRequest {
  name: string
  appName: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  sortOrder?: number
  stripePriceId?: string
}

export interface UpdatePlanRequest {
  name?: string
  description?: string | null
  amount?: number
  currency?: string
  interval?: 'month' | 'year'
  intervalCount?: number
  features?: string[]
  active?: boolean
  sortOrder?: number
  stripePriceId?: string | null
}

export interface PlanResponse {
  success: boolean
  data: {
    plan: Plan
  }
}

export interface PlansListResponse {
  success: boolean
  data: Plan[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// Stripe Connect Types
export type ConnectAccountType = 'standard' | 'express'

export type ConnectAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled'

export interface ConnectedAccount {
  stripeAccountId: string
  email: string
  businessName: string
  accountType: ConnectAccountType
  status: ConnectAccountStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultFeePercent: number
  onboardedAt: string | null
  createdAt: string
}

export interface ConnectStatusResponse {
  connectedAccount: ConnectedAccount | null
}

export interface ConnectOnboardRequest {
  email: string
  businessName: string
  type: ConnectAccountType
}

export interface ConnectOnboardResponse {
  accountLinkUrl: string
  connectedAccount: ConnectedAccount
}

export interface ConnectDashboardLinkResponse {
  loginLinkUrl: string
  message?: string
}

// API Requests
export interface CreateDonationRequest {
  projectId: string
  amount: number
  currency?: string
  message?: string
  isPublic?: boolean
  isAnonymous?: boolean
  userId?: string
  donorName?: string
  donorEmail?: string
}

export interface CreatePurchaseRequest {
  projectId: string
  productId: string
  productName: string
  amount: number
  quantity?: number
  currency?: string
  userId?: string
  customerName?: string
  customerEmail?: string
  promoCode?: string
}

export interface CreateSubscriptionRequest {
  projectId: string
  planId: string
  planName: string
  amount: number
  interval?: 'month'
  intervalCount?: number
  currency?: string
  userId?: string
  customerName?: string
  customerEmail?: string
  promoCode?: string
}

// API Responses
export interface PaymentResponse {
  success: boolean
  payment: Payment
  checkoutUrl: string
}

export interface PaymentsListResponse {
  success: boolean
  payments: Payment[]
  total: number
}

export interface StatsResponse {
  success: boolean
  stats: {
    total: number
    count: number
    byType: Record<PaymentType, { total: number; count: number }>
    recent: Payment[]
  }
}

// ---------------------------------------------------------------------------
// API Keys (P6) — developer portal resources
// ---------------------------------------------------------------------------

/**
 * A single EZPay API key item as returned by `GET /api/keys`.
 *
 * Scoped to an ezauth {@link https://ezstart.dev Application} via the
 * `applicationId` + `appSlug` fields. The raw key value is never exposed — only
 * the opaque `keyPrefix` is safe to display.
 */
export interface PayApiKeyItem {
  id: string
  keyPrefix: string
  name: string
  applicationId: string
  appSlug: string
  type: 'publishable' | 'secret'
  env: 'live' | 'test'
  scope: 'admin' | 'user' | 'readonly'
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
  quotaMonthly: number | null
  usageThisMonth: number
}

/**
 * Body accepted by `POST /api/keys` when creating a new EZPay API key.
 */
export interface CreatePayApiKeyRequest {
  name: string
  applicationId: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
  expiresAt?: string | null
}

/**
 * Response payload returned by `POST /api/keys`. The `key` field is the raw
 * one-time value and MUST be surfaced to the user exactly once.
 */
export interface CreatePayApiKeyResponse {
  id: string
  key: string
  keyPrefix: string
  name: string
  type: 'publishable' | 'secret'
  env: 'live' | 'test'
  scope: 'admin' | 'user' | 'readonly'
  applicationId: string
  appSlug: string
}

/**
 * Usage snapshot for a single EZPay API key. Returned by
 * `GET /api/keys/:id/usage`.
 *
 * `quota.limit` and `quota.remaining` are `null` when no `quotaMonthly` is
 * configured on the key (unlimited plan).
 */
export interface PayApiKeyUsageResponse {
  currentMonth: {
    requestCount: number
    topEndpoints: Array<{ endpoint: string; count: number }>
  }
  daily: Array<{ date: string; requestCount: number }>
  quota: {
    limit: number | null
    used: number
    remaining: number | null
  }
}
