/**
 * Core PayClient — 100% agnostic, zero @ezstart/* deps.
 * Uses `fetch()` directly. Requires `apiUrl` to be provided by the caller.
 */
import type {
  PayClientConfig,
  ApplicationConfigResponse,
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  CreatePromoRequest,
  UpdatePromoRequest,
  CreatePlanRequest,
  UpdatePlanRequest,
  Payment,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
  PromoResponse,
  PromosListResponse,
  PromoValidationResponse,
  PlanResponse,
  PlansListResponse,
  ConnectStatusResponse,
  ConnectOnboardRequest,
  ConnectOnboardResponse,
  ConnectDashboardLinkResponse,
  BillingPortalRequest,
  BillingPortalResponse,
} from './types.js'

export class PayClient {
  private config: PayClientConfig

  constructor(config: PayClientConfig) {
    this.config = config
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

  /** Build headers with optional Authorization bearer token and API key */
  private getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra }
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey
    }
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

    const url = `${this.config.apiUrl}/${path}?${searchParams.toString()}`
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

    const response = await this.fetchWithAuth(`${this.config.apiUrl}/donate`, {
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
      `${this.config.apiUrl}/donations/stats?${searchParams.toString()}`,
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

    const response = await this.fetchWithAuth(`${this.config.apiUrl}/purchase`, {
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

    const response = await this.fetchWithAuth(`${this.config.apiUrl}/subscribe`, {
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
    projectId?: string
    limit?: number
    offset?: number
    liveMode?: string
    /**
     * RBAC scope applied by the API:
     * - `mine` — only the caller's own subscriptions (default)
     * - `myApps` — caller's own + subscriptions on Applications the caller owns
     * - `all` — all subscriptions (superadmin only; 403 otherwise)
     */
    scope?: 'mine' | 'myApps' | 'all'
  }): Promise<PaymentsListResponse> {
    return this.fetchList('subscriptions', params)
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    const response = await this.fetchWithAuth(
      `${this.config.apiUrl}/subscriptions/${subscriptionId}/cancel`,
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
      `${this.config.apiUrl}/payments/${paymentId}/refund`,
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
    projectId?: string
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
  }): Promise<PaymentsListResponse> {
    return this.fetchList('payments', params)
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/payments/${paymentId}`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch payment')
    }

    return result.payment
  }

  // ===== PROMOS =====

  async createPromo(data: CreatePromoRequest): Promise<PromoResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/promos`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create promo')
    }

    return result.data ?? result
  }

  async listPromos(params?: {
    /**
     * @deprecated Use `applicationId` instead.
     */
    appName?: string
    applicationId?: string
    active?: boolean
    limit?: number
    offset?: number
  }): Promise<PromosListResponse> {
    const searchParams = new URLSearchParams()
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') searchParams.set(key, String(value))
      }
    }

    const response = await this.fetchWithAuth(
      `${this.config.apiUrl}/promos?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to list promos')
    }

    // Map MongoDB _id to id for SDK type compatibility
    const data = result.data ?? result.promos ?? []
    const promos = data.map((p: Record<string, unknown>) => ({
      ...p,
      id: p.id || p._id,
    }))

    return { ...result, data: promos, promos }
  }

  async validatePromo(code: string, appName: string): Promise<PromoValidationResponse> {
    const searchParams = new URLSearchParams({ appName })

    const response = await fetch(
      `${this.config.apiUrl}/promos/validate/${encodeURIComponent(code)}?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to validate promo')
    }

    return result
  }

  async updatePromo(promoId: string, data: UpdatePromoRequest): Promise<PromoResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/promos/${promoId}`, {
      method: 'PATCH',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update promo')
    }

    return result.data ?? result
  }

  async deletePromo(promoId: string): Promise<{ success: boolean }> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/promos/${promoId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete promo')
    }

    return result
  }

  // ===== CLEANUP =====

  async cleanupPayments(appName?: string): Promise<{ deletedCount: number }> {
    const params = appName ? `?appName=${appName}` : ''
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/payments/cleanup${params}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to cleanup')
    return result.data ?? result
  }

  // ===== PLANS =====

  async createPlan(data: CreatePlanRequest): Promise<PlanResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/plans`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create plan')
    }

    return result.data ?? result
  }

  async listPlans(params?: {
    /**
     * @deprecated Use `applicationId` instead.
     */
    appName?: string
    applicationId?: string
    active?: boolean
    limit?: number
    offset?: number
  }): Promise<PlansListResponse> {
    const searchParams = new URLSearchParams()
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') searchParams.set(key, String(value))
      }
    }

    // Public endpoint — no auth needed, but include token if available
    const url = `${this.config.apiUrl}/plans?${searchParams.toString()}`
    const response = await fetch(url, { headers: this.getHeaders() })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to list plans')
    }

    // Map MongoDB _id to id for SDK type compatibility
    const data = result.data ?? result.plans ?? []
    const plans = data.map((p: Record<string, unknown>) => ({
      ...p,
      id: p.id || p._id,
    }))

    return { ...result, data: plans }
  }

  async updatePlan(planId: string, data: UpdatePlanRequest): Promise<PlanResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/plans/${planId}`, {
      method: 'PATCH',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update plan')
    }

    return result.data ?? result
  }

  async deletePlan(planId: string): Promise<{ success: boolean }> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/plans/${planId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete plan')
    }

    return result
  }

  // ===== STRIPE CONNECT =====

  async getConnectStatus(): Promise<ConnectStatusResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/connect/status`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch connect status')
    }

    return result.data ?? result
  }

  async connectOnboard(data: ConnectOnboardRequest): Promise<ConnectOnboardResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/connect/onboard`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to start onboarding')
    }

    return result.data ?? result
  }

  async getConnectDashboardLink(): Promise<ConnectDashboardLinkResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/connect/dashboard-link`, {
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get dashboard link')
    }

    return result.data ?? result
  }

  async disconnectAccount(): Promise<{ success: boolean }> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/connect/disconnect`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to disconnect account')
    }

    return result
  }

  // ===== APPLICATION CONFIG =====

  /**
   * Resolve the EZPay Application a publishable key belongs to.
   *
   * Calls the public `GET /api/keys/config?key=<publishableKey>` endpoint and
   * returns the `{ applicationId, appSlug, apiUrl, webUrl, type, env, scope }`
   * payload. No auth required — the key IS the auth.
   *
   * Consumers typically don't call this directly; `<PayProvider publishableKey="…" />`
   * calls it on mount and injects the result into the React context.
   *
   * @example
   * ```ts
   * const cfg = await client.resolveApplicationByKey('ez_pk_live_abc')
   * console.log(cfg.applicationId, cfg.appSlug)
   * ```
   */
  async resolveApplicationByKey(publishableKey: string): Promise<ApplicationConfigResponse> {
    if (!publishableKey) {
      throw new Error('publishableKey is required to resolve application config')
    }

    const url = `${this.config.apiUrl}/keys/config?key=${encodeURIComponent(publishableKey)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error || `Failed to resolve application (${response.status})`)
    }

    // Endpoint always wraps as `{ success: true, data: {...} }` — unwrap.
    const payload: ApplicationConfigResponse = result?.data ?? result
    if (!payload?.applicationId || !payload?.appSlug) {
      throw new Error('Invalid application config response: missing applicationId or appSlug')
    }

    return payload
  }

  // ===== BILLING PORTAL (Stripe Customer Portal) =====

  /**
   * Create a Stripe Customer Portal session for the authenticated user.
   *
   * When `customerId` is omitted, the API resolves the Stripe customer from
   * the user's most recent subscription payment. The returned `url` is a
   * short-lived Stripe-hosted link — redirect the user there.
   *
   * @example
   * ```ts
   * const { url } = await client.createBillingPortalSession({ returnUrl: window.location.href })
   * window.location.href = url
   * ```
   */
  async createBillingPortalSession(params?: BillingPortalRequest): Promise<BillingPortalResponse> {
    const response = await this.fetchWithAuth(`${this.config.apiUrl}/billing/portal`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params ?? {}),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create billing portal session')
    }

    return result.data ?? result
  }
}

/** Create a PayClient instance with the given config */
export function createPayClient(config: PayClientConfig): PayClient {
  return new PayClient(config)
}
