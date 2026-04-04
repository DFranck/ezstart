import { getApiUrl, getWebUrl, getCurrentEnvironment } from '@ezstart/config/urls'
import type {
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  PayClientConfig,
  Payment,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
} from './types.js'

// Helper to get the correct URLs based on environment
function getEZPayUrls() {
  // Detect environment (local, development, production)
  const env = getCurrentEnvironment()

  return {
    apiBaseURL: `${getApiUrl('ezpay', env)}/api`,
    webBaseURL: getWebUrl('ezpay', env),
  }
}

export class PayClient {
  private config: PayClientConfig
  private urls: ReturnType<typeof getEZPayUrls>

  constructor(config: PayClientConfig) {
    this.urls = getEZPayUrls()
    this.config = {
      ...config,
      baseURL: config.baseURL || this.urls.apiBaseURL,
    }
  }

  /** Resolve return URL: explicit config > window.location origin > undefined */
  private getReturnUrl(): string | undefined {
    return (
      this.config.returnUrl ??
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : undefined)
    )
  }

  /** Build headers with optional Authorization bearer token */
  private getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra }
    const token = this.config.getToken?.()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  // ===== DONATIONS =====

  async createDonation(data: CreateDonationRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await fetch(`${this.config.baseURL}/donate`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...data, returnUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create donation')
    }

    // Unwrap standard { success, data } response
    return result.data ?? result
  }

  async getDonations(params?: {
    projectId?: string
    limit?: number
  }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const response = await fetch(`${this.config.baseURL}/donations?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch donations')
    }

    // Normalize MongoDB _id to id
    if (result.payments) {
      result.payments = result.payments.map((p: Payment & { _id?: string }) => ({
        ...p,
        id: p.id || p._id,
      }))
    }

    return result
  }

  async getDonationStats(projectId?: string): Promise<StatsResponse> {
    const searchParams = new URLSearchParams()
    if (projectId) searchParams.set('projectId', projectId)

    const response = await fetch(
      `${this.config.baseURL}/donations/stats?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch donation stats')
    }

    return result
  }

  // ===== PURCHASES =====

  async createPurchase(data: CreatePurchaseRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await fetch(`${this.config.baseURL}/purchase`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...data, returnUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create purchase')
    }

    // Unwrap standard { success, data } response
    return result.data ?? result
  }

  async getPurchases(params?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.set('userId', params.userId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const response = await fetch(`${this.config.baseURL}/purchases?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch purchases')
    }

    // Unwrap standard { success, data, meta } response
    return {
      success: result.success,
      payments: (result.data ?? []).map((p: Payment & { _id?: string }) => ({
        ...p,
        id: p.id || p._id,
      })),
      total: result.meta?.total ?? 0,
    }
  }

  // ===== SUBSCRIPTIONS =====

  async createSubscription(data: CreateSubscriptionRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await fetch(`${this.config.baseURL}/subscribe`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...data, returnUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create subscription')
    }

    // Unwrap standard { success, data } response
    return result.data ?? result
  }

  async getSubscriptions(params?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.set('userId', params.userId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const response = await fetch(
      `${this.config.baseURL}/subscriptions?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch subscriptions')
    }

    // Unwrap standard { success, data, meta } response
    return {
      success: result.success,
      payments: (result.data ?? []).map((p: Payment & { _id?: string }) => ({
        ...p,
        id: p.id || p._id,
      })),
      total: result.meta?.total ?? 0,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.config.baseURL}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to cancel subscription')
    }

    return result
  }

  // ===== REFUNDS =====

  async refundPayment(paymentId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.config.baseURL}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to refund payment')
    }

    return result
  }

  // ===== MY PAYMENTS =====

  async getMyPayments(params?: {
    type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.set('type', params.type)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const response = await fetch(`${this.config.baseURL}/payments/me?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch my payments')
    }

    // Unwrap standard { success, data, meta } response
    return {
      success: result.success,
      payments: (result.data ?? []).map((p: Payment & { _id?: string }) => ({
        ...p,
        id: p.id || p._id,
      })),
      total: result.meta?.total ?? 0,
    }
  }

  // ===== GENERAL =====

  async getPayments(params?: {
    userId?: string
    limit?: number
    offset?: number
    type?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.set('userId', params.userId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    if (params?.type) searchParams.set('type', params.type)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)

    const response = await fetch(`${this.config.baseURL}/payments?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch payments')
    }

    // Unwrap standard { success, data, meta } response
    return {
      success: result.success,
      payments: (result.data ?? []).map((p: Payment & { _id?: string }) => ({
        ...p,
        id: p.id || p._id,
      })),
      total: result.meta?.total ?? 0,
    }
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await fetch(`${this.config.baseURL}/payments/${paymentId}`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch payment')
    }

    return result.payment
  }
}

// Helper function to create PayClient with auto-configured URLs
export function createPayClient(config: Omit<PayClientConfig, 'baseURL'> & { baseURL?: string }) {
  return new PayClient(config)
}
