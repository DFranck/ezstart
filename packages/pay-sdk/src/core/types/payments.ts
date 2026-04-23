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
