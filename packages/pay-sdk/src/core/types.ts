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
  /**
   * Legacy app-slug identifier (e.g. `'ezbill'`). Kept for backward compatibility
   * with existing consumers. Prefer `applicationId` for new code — it resolves
   * to the Application document id in ezauth and unambiguously scopes requests
   * regardless of slug renames.
   *
   * @deprecated Use `applicationId` instead. This field will be removed once all
   * consumers migrate (target: 2026-07).
   */
  appName?: string
  /**
   * Ezauth Application id the client is scoped to. When provided, takes
   * precedence over `appName` in list/query operations. Typically populated
   * automatically by `<PayProvider publishableKey="…" />` via `/api/keys/config`.
   */
  applicationId?: string
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
 * Response shape returned by `GET /api/keys/config?key=<publishableKey>`
 * (ezpay). Used by the React provider to auto-wire `applicationId` / `appSlug`
 * from a single public key.
 *
 * Fields marked optional are not strictly required for client-side wiring — the
 * `apiUrl` / `webUrl` come from the ezpay environment config and should only be
 * used for cross-checks.
 */
export interface ApplicationConfigResponse {
  applicationId: string
  appSlug: string
  apiUrl?: string
  webUrl?: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
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
  /**
   * @deprecated Read `applicationId` instead. Retained while the backend
   * dual-writes during the 90-day migration window.
   */
  appName: string
  /** Ezauth Application id this promo belongs to. */
  applicationId?: string
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
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id this promo belongs to. Takes precedence over `appName`. */
  applicationId?: string
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

/**
 * Structured extras attached to a Plan. Mirrors `PlanMetadata` in the backend
 * (`apps/ezpay/api/src/models/Plan.ts`).
 */
export interface PlanMetadata {
  /** Roles granted to the user when the subscription activates (JWT claim materialisation). */
  grantsRoles?: string[]
  /** Features granted to the user when the subscription activates. */
  grantsFeatures?: string[]
  /** Platform application fee percent applied to Connect charges for this plan (0-100). */
  feePercent?: number
  /**
   * Logical grouping identifier that links a Monthly plan to its Yearly
   * variant. Two plans sharing the same `billingGroup` are treated as
   * alternative billing cycles of the same tier by PricingPage's
   * Monthly/Yearly toggle.
   */
  billingGroup?: string
  /**
   * Headline savings (in %) of the Yearly variant vs the Monthly variant in
   * the same billingGroup. Purely decorative (rendered as "Save 20%").
   */
  discountVsMonthly?: number
}

export interface Plan {
  id: string
  name: string
  /**
   * @deprecated Read `applicationId` instead. Retained while the backend
   * dual-writes during the 90-day migration window.
   */
  appName: string
  /** Ezauth Application id this plan belongs to. */
  applicationId?: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  sortOrder: number
  stripePriceId?: string
  /**
   * Free-trial duration in days (0-90). `0` or `undefined` disables the
   * trial. Applied to Stripe Checkout subscription sessions via
   * `subscription_data.trial_period_days`.
   */
  trialDays?: number
  /** Structured extras: grants, fee %, billing group, yearly discount. */
  metadata?: PlanMetadata
  createdAt: string
  updatedAt: string
}

export interface CreatePlanRequest {
  name: string
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id this plan belongs to. Takes precedence over `appName`. */
  applicationId?: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  sortOrder?: number
  stripePriceId?: string
  /** Free-trial duration in days (0-90). */
  trialDays?: number
  /** Structured extras — billingGroup, discountVsMonthly, grants, fee %. */
  metadata?: PlanMetadata
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
  /** Free-trial duration in days (0-90). `null` clears the trial. */
  trialDays?: number | null
  /** Structured extras — pass `null` as individual entries to clear them. */
  metadata?: PlanMetadata
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
  /** Ezauth Application id this account belongs to (one account per app). */
  applicationId: string
  /**
   * `true` when this points at the shared platform (EZStart LLC) Stripe account
   * used by dogfood apps. `false` when the app has onboarded its own external
   * Stripe Connect account.
   */
  isPlatformAccount: boolean
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
  /** Required — the Application the new Connect account belongs to. */
  applicationId: string
  email: string
  businessName: string
  type: ConnectAccountType
  /**
   * Optional — user locale (e.g. `'en'`, `'fr'`) propagated to the
   * post-onboarding callback so the API redirects the user back to the
   * correct locale route in the EZPay web UI. Defaults to `'en'` server-side.
   */
  locale?: string
}

/**
 * Body accepted by `PATCH /api/connect/accounts/:applicationId` — superadmin-only
 * switchability between platform and external Stripe accounts.
 */
export interface ConnectConvertRequest {
  /** New Stripe account id (must start with `acct_`). */
  stripeAccountId: string
  /** `true` = platform dogfood account, `false` = external Connect account. */
  isPlatformAccount: boolean
}

export interface ConnectOnboardResponse {
  accountLinkUrl: string
  connectedAccount: ConnectedAccount
}

export interface ConnectDashboardLinkResponse {
  loginLinkUrl: string
  message?: string
}

// Billing Portal (Stripe Customer Portal)

/**
 * Response payload returned by `POST /api/billing/portal`.
 *
 * The `url` is a short-lived Stripe-hosted portal URL — redirect the user
 * there (e.g. `window.location.href = url`).
 */
export interface BillingPortalResponse {
  url: string
}

/**
 * Body accepted by `POST /api/billing/portal`. When `customerId` is omitted,
 * the route resolves the customer from the authenticated user's most recent
 * subscription.
 */
export interface BillingPortalRequest {
  /** URL the customer is redirected to after leaving the portal. */
  returnUrl?: string
  /** Explicit Stripe customer id — skips auto-resolution from subscriptions. */
  customerId?: string
}

// API Requests
export interface CreateDonationRequest {
  projectId: string
  /**
   * Ezauth Application id the donation is scoped to. Preferred over `projectId`
   * for new code — the backend will resolve `projectId` to an application
   * during the 90-day migration window.
   */
  applicationId?: string
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
  /**
   * Ezauth Application id the purchase is scoped to. Preferred over `projectId`
   * for new code.
   */
  applicationId?: string
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
  /**
   * Ezauth Application id the subscription is scoped to. Preferred over
   * `projectId` for new code.
   */
  applicationId?: string
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

/**
 * Body accepted by `POST /api/subscriptions/:subscriptionId/change-plan`.
 *
 * Swaps the Stripe Price on an active subscription (upgrade / downgrade).
 * Proration is controlled by `prorationBehavior` and defaults to
 * `create_prorations` (Stripe's standard behaviour — the next invoice is
 * prorated to reflect the immediate change).
 */
export interface ChangePlanRequest {
  /** Target Plan id (EZPay, NOT Stripe Price id). */
  newPlanId: string
  /**
   * Stripe proration behaviour:
   * - `create_prorations` (default): standard proration on the next invoice.
   * - `none`: no proration — new price kicks in at the next billing cycle.
   * - `always_invoice`: always bill the prorated amount immediately.
   */
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

/**
 * Response payload returned by `POST /api/subscriptions/:subscriptionId/change-plan`.
 */
export interface ChangePlanResponse {
  subscriptionId: string
  status: string
  currentPeriodEnd: number
  newPlanId: string
  newStripePriceId: string
}

/**
 * Query parameters accepted by `PayClient.getPayments()` (and the
 * `GET /api/payments` route).
 *
 * `applicationId` scopes the result to a single Ezauth Application — the API
 * resolves it to the underlying app slug and filters `projectId` accordingly.
 * When omitted, payments from every application the caller has access to are
 * returned (legacy behaviour, back-compat only).
 */
export interface GetPaymentsParams {
  userId?: string
  projectId?: string
  /**
   * Ezauth Application id to scope the listing to (preferred). When provided,
   * the API combines this filter with the RBAC scope via AND — a regular user
   * sees only their own payments on this application, a `myApps` caller sees
   * revenue for this application only, and a superadmin (`scope=all`) also
   * remains scoped to this application.
   */
  applicationId?: string
  limit?: number
  offset?: number
  type?: string
  status?: string
  liveMode?: string
  dateFrom?: string
  dateTo?: string
  /**
   * RBAC scope applied by the API:
   * - `mine` — only the caller's own payments (default)
   * - `myApps` — caller's own + payments on Applications the caller owns
   * - `all` — all payments (superadmin only; 403 otherwise)
   */
  scope?: 'mine' | 'myApps' | 'all'
  /**
   * Optional `AbortSignal` propagated to the underlying `fetch` call. When the
   * signal is aborted, the in-flight HTTP request is cancelled at the network
   * layer (not just discarded UI-side). Used by `usePaymentHistory` to avoid
   * wasting server bandwidth on stale-scope reads when the user switches apps.
   */
  signal?: AbortSignal
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
