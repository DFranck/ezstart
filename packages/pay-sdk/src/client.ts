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

  // ===== DONATIONS =====

  async createDonation(data: CreateDonationRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await fetch(`${this.config.baseURL}/donate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, returnUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create donation')
    }

    return result
  }

  async getDonations(params?: {
    projectId?: string
    limit?: number
  }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const response = await fetch(`${this.config.baseURL}/donations?${searchParams.toString()}`)

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
      `${this.config.baseURL}/donations/stats?${searchParams.toString()}`
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, returnUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create purchase')
    }

    return result
  }

  async getPurchases(params?: { userId?: string; limit?: number }): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.userId) searchParams.set('userId', params.userId)
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const response = await fetch(`${this.config.baseURL}/purchases?${searchParams.toString()}`)

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch purchases')
    }

    return result
  }

  // ===== SUBSCRIPTIONS =====

  async createSubscription(data: CreateSubscriptionRequest): Promise<PaymentResponse> {
    const returnUrl = this.getReturnUrl()

    const response = await fetch(`${this.config.baseURL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, returnUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create subscription')
    }

    return result
  }

  async getSubscriptions(userId: string): Promise<PaymentsListResponse> {
    const response = await fetch(`${this.config.baseURL}/subscriptions?userId=${userId}`)

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch subscriptions')
    }

    return result
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.config.baseURL}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to cancel subscription')
    }

    return result
  }

  // ===== GENERAL =====

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await fetch(`${this.config.baseURL}/payments/${paymentId}`)

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
