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

  /**
   * Fetch with automatic 401 retry: when a request returns 401 and an
   * `onTokenRefresh` callback is configured, refresh the token and retry once.
   * If the refresh itself fails, invoke `onAuthFailure` (logout / redirect).
   */
  private async fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
    let response = await fetch(url, options)

    if (response.status === 401 && this.config.onTokenRefresh) {
      try {
        const newToken = await this.config.onTokenRefresh()
        if (newToken) {
          const retryHeaders = new Headers(options.headers)
          retryHeaders.set('Authorization', `Bearer ${newToken}`)
          response = await fetch(url, { ...options, headers: retryHeaders })
        }
      } catch {
        this.config.onAuthFailure?.()
        return response
      }
    }

    // If still 401 after retry (or no refresh callback), signal auth failure
    if (response.status === 401) {
      this.config.onAuthFailure?.()
    }

    return response
  }

  /**
   * Centralized list fetcher — normalizes API response { success, data, meta }
   * into { payments, total } format expected by hooks.
   */
  private async fetchList(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') searchParams.set(key, String(value))
      }
    }

    const url = `${this.config.baseURL}/${path}?${searchParams.toString()}`
    const response = await this.fetchWithAuth(url, { headers: this.getHeaders() })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `Failed to fetch ${path}`)
    }

    // Normalize: API returns { success, data, meta } → { payments, total }
    const rawList = result.data || result.payments || []
    const payments = rawList.map((p: Payment & { _id?: string }) => ({
      ...p,
      id: p.id || p._id,
    }))

    return { success: true, payments, total: result.meta?.total ?? payments.length }
  }

  // ===== DONATIONS =====

  async createDonation(data: CreateDonationRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await this.fetchWithAuth(`${this.config.baseURL}/donate`, {
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
    return this.fetchList('donations', params)
  }

  async getDonationStats(projectId?: string): Promise<StatsResponse> {
    const searchParams = new URLSearchParams()
    if (projectId) searchParams.set('projectId', projectId)

    const response = await this.fetchWithAuth(
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

    const response = await this.fetchWithAuth(`${this.config.baseURL}/purchase`, {
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
    return this.fetchList('purchases', params)
  }

  // ===== SUBSCRIPTIONS =====

  async createSubscription(data: CreateSubscriptionRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await this.fetchWithAuth(`${this.config.baseURL}/subscribe`, {
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
    return this.fetchList('subscriptions', params)
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    const response = await this.fetchWithAuth(
      `${this.config.baseURL}/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to cancel subscription')
    }

    return result
  }

  // ===== REFUNDS =====

  async refundPayment(paymentId: string): Promise<{ success: boolean }> {
    const response = await this.fetchWithAuth(
      `${this.config.baseURL}/payments/${paymentId}/refund`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

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
    return this.fetchList('payments/me', params)
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
    return this.fetchList('payments', params)
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.fetchWithAuth(`${this.config.baseURL}/payments/${paymentId}`, {
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
