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
  metadata?: Record<string, any>
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

// Client Config
export interface PayClientConfig {
  baseURL?: string
  appName: string
  /** Explicit return URL for payment redirects. Falls back to window.location origin. */
  returnUrl?: string
  /** Optional callback to retrieve the current auth token dynamically.
   *  When provided, the token is sent as `Authorization: Bearer <token>` on every request. */
  getToken?: () => string | null | undefined
  /** Optional callback to refresh the auth token when a 401 is received.
   *  Should return the new access token, or null if refresh failed. */
  onTokenRefresh?: () => Promise<string | null>
  /** Optional callback invoked when token refresh fails (e.g. to trigger logout/redirect). */
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
