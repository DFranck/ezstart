// Payment Types
export type PaymentType = 'donation' | 'purchase' | 'subscription' | 'invoice'

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
    interval: 'month' | 'year'
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
}

export interface CreateSubscriptionRequest {
  projectId: string
  planId: string
  planName: string
  amount: number
  interval: 'month' | 'year'
  currency?: string
  userId?: string
  customerName?: string
  customerEmail?: string
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
