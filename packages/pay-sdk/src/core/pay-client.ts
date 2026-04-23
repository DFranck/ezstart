/**
 * Core PayClient — 100% agnostic, zero @ezstart/* deps.
 * Uses `fetch()` directly. Requires `apiUrl` to be provided by the caller.
 *
 * The class is a thin orchestrator: each method delegates to a pure function
 * in `./methods/<domain>.ts`. Shared HTTP helpers live in `./methods/http.ts`.
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
  ChangePlanRequest,
  ChangePlanResponse,
  GetPaymentsParams,
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
} from './types/index.js'
import {
  buildHeaders,
  fetchList,
  fetchWithAuth,
  resolveReturnUrl,
  type PayClientInternal,
} from './methods/http.js'
import {
  createDonation as createDonationImpl,
  getDonations as getDonationsImpl,
  getDonationStats as getDonationStatsImpl,
} from './methods/donations.js'
import {
  createPurchase as createPurchaseImpl,
  getPurchases as getPurchasesImpl,
} from './methods/purchases.js'
import {
  cancelSubscription as cancelSubscriptionImpl,
  changeSubscriptionPlan as changeSubscriptionPlanImpl,
  createSubscription as createSubscriptionImpl,
  getSubscriptions as getSubscriptionsImpl,
  type GetSubscriptionsParams,
} from './methods/subscriptions.js'
import {
  cleanupPayments as cleanupPaymentsImpl,
  getMyPayments as getMyPaymentsImpl,
  getPayment as getPaymentImpl,
  getPayments as getPaymentsImpl,
  refundPayment as refundPaymentImpl,
} from './methods/payments.js'
import {
  createPromo as createPromoImpl,
  deletePromo as deletePromoImpl,
  listPromos as listPromosImpl,
  updatePromo as updatePromoImpl,
  validatePromo as validatePromoImpl,
  type ListPromosParams,
} from './methods/promos.js'
import {
  createPlan as createPlanImpl,
  deletePlan as deletePlanImpl,
  listPlans as listPlansImpl,
  updatePlan as updatePlanImpl,
  type ListPlansParams,
} from './methods/plans.js'
import {
  connectOnboard as connectOnboardImpl,
  disconnectAccount as disconnectAccountImpl,
  getConnectDashboardLink as getConnectDashboardLinkImpl,
  getConnectStatus as getConnectStatusImpl,
} from './methods/connect.js'
import {
  createBillingPortalSession as createBillingPortalSessionImpl,
  resolveApplicationByKey as resolveApplicationByKeyImpl,
} from './methods/billing.js'

export class PayClient implements PayClientInternal {
  readonly config: PayClientConfig

  constructor(config: PayClientConfig) {
    this.config = config
  }

  // ===== INTERNAL (exposed via PayClientInternal for method modules) =====

  /** Resolve return URL: explicit config > window.location origin > undefined */
  getReturnUrl(): string | undefined {
    return resolveReturnUrl(this.config)
  }

  /** Build headers with optional Authorization bearer token and API key */
  getHeaders(extra?: Record<string, string>): Record<string, string> {
    return buildHeaders(this.config, extra)
  }

  /**
   * Fetch with automatic 401 retry: when a request returns 401 and an
   * `onTokenRefresh` callback is configured, refresh the token and retry once.
   * If the refresh itself fails, invoke `onAuthFailure` (logout / redirect).
   */
  fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
    return fetchWithAuth(this.config, url, options)
  }

  /**
   * Centralized list fetcher — normalizes API response { success, data, meta }
   * into { payments, total } format expected by hooks.
   */
  fetchList(
    path: string,
    params?: Record<string, string | number | undefined>,
    options?: { signal?: AbortSignal }
  ): Promise<PaymentsListResponse> {
    return fetchList(this, path, params, options)
  }

  // ===== DONATIONS =====

  createDonation(data: CreateDonationRequest): Promise<PaymentResponse> {
    return createDonationImpl(this, data)
  }

  getDonations(params?: { projectId?: string; limit?: number }): Promise<PaymentsListResponse> {
    return getDonationsImpl(this, params)
  }

  getDonationStats(projectId?: string): Promise<StatsResponse> {
    return getDonationStatsImpl(this, projectId)
  }

  // ===== PURCHASES =====

  createPurchase(data: CreatePurchaseRequest): Promise<PaymentResponse> {
    return createPurchaseImpl(this, data)
  }

  getPurchases(params?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<PaymentsListResponse> {
    return getPurchasesImpl(this, params)
  }

  // ===== SUBSCRIPTIONS =====

  createSubscription(data: CreateSubscriptionRequest): Promise<PaymentResponse> {
    return createSubscriptionImpl(this, data)
  }

  getSubscriptions(params?: GetSubscriptionsParams): Promise<PaymentsListResponse> {
    return getSubscriptionsImpl(this, params)
  }

  cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    return cancelSubscriptionImpl(this, subscriptionId)
  }

  /**
   * Change the plan on an active subscription (upgrade / downgrade).
   *
   * Calls `POST /subscriptions/:id/change-plan` which swaps the Stripe Price
   * on the subscription item using the provided proration behaviour.
   *
   * @example
   * await client.changeSubscriptionPlan('sub_123', {
   *   newPlanId: 'plan_pro_yearly_id',
   *   prorationBehavior: 'create_prorations',
   * })
   */
  changeSubscriptionPlan(
    subscriptionId: string,
    data: ChangePlanRequest
  ): Promise<ChangePlanResponse> {
    return changeSubscriptionPlanImpl(this, subscriptionId, data)
  }

  // ===== REFUNDS =====

  refundPayment(paymentId: string): Promise<{ success: boolean }> {
    return refundPaymentImpl(this, paymentId)
  }

  // ===== MY PAYMENTS =====

  getMyPayments(params?: {
    type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<PaymentsListResponse> {
    return getMyPaymentsImpl(this, params)
  }

  // ===== GENERAL =====

  /**
   * List payments scoped by RBAC + optional `applicationId`.
   *
   * `applicationId` filters payments to a single Ezauth Application (the API
   * resolves it to the underlying slug and filters `projectId`). When the
   * caller omits `applicationId` but the client was constructed with one
   * (via `<PayProvider publishableKey>` or explicit config), the client's
   * `applicationId` is injected automatically — this is what keeps the
   * `<BillingDashboard>` of each app scoped to its own payments.
   *
   * Pass `applicationId: ''` explicitly to opt out of the auto-injection
   * (e.g. for a cross-app superadmin view).
   *
   * @example
   * // Scoped to the current app (applicationId comes from PayProvider)
   * await client.getPayments({ userId: 'u_1' })
   *
   * // Explicit scope to another app
   * await client.getPayments({ userId: 'u_1', applicationId: 'app_123' })
   *
   * // Superadmin cross-app view (bypass auto-injection)
   * await client.getPayments({ scope: 'all', applicationId: '' })
   */
  getPayments(params?: GetPaymentsParams): Promise<PaymentsListResponse> {
    return getPaymentsImpl(this, params)
  }

  getPayment(paymentId: string): Promise<Payment> {
    return getPaymentImpl(this, paymentId)
  }

  // ===== PROMOS =====

  createPromo(data: CreatePromoRequest): Promise<PromoResponse> {
    return createPromoImpl(this, data)
  }

  listPromos(params?: ListPromosParams): Promise<PromosListResponse> {
    return listPromosImpl(this, params)
  }

  validatePromo(code: string, appName: string): Promise<PromoValidationResponse> {
    return validatePromoImpl(this, code, appName)
  }

  updatePromo(promoId: string, data: UpdatePromoRequest): Promise<PromoResponse> {
    return updatePromoImpl(this, promoId, data)
  }

  deletePromo(promoId: string): Promise<{ success: boolean }> {
    return deletePromoImpl(this, promoId)
  }

  // ===== CLEANUP =====

  cleanupPayments(appName?: string): Promise<{ deletedCount: number }> {
    return cleanupPaymentsImpl(this, appName)
  }

  // ===== PLANS =====

  createPlan(data: CreatePlanRequest): Promise<PlanResponse> {
    return createPlanImpl(this, data)
  }

  listPlans(params?: ListPlansParams): Promise<PlansListResponse> {
    return listPlansImpl(this, params)
  }

  updatePlan(planId: string, data: UpdatePlanRequest): Promise<PlanResponse> {
    return updatePlanImpl(this, planId, data)
  }

  deletePlan(planId: string): Promise<{ success: boolean }> {
    return deletePlanImpl(this, planId)
  }

  // ===== STRIPE CONNECT =====

  getConnectStatus(params?: { applicationId?: string }): Promise<ConnectStatusResponse> {
    return getConnectStatusImpl(this, params)
  }

  connectOnboard(data: ConnectOnboardRequest): Promise<ConnectOnboardResponse> {
    return connectOnboardImpl(this, data)
  }

  getConnectDashboardLink(): Promise<ConnectDashboardLinkResponse> {
    return getConnectDashboardLinkImpl(this)
  }

  disconnectAccount(): Promise<{ success: boolean }> {
    return disconnectAccountImpl(this)
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
  resolveApplicationByKey(publishableKey: string): Promise<ApplicationConfigResponse> {
    return resolveApplicationByKeyImpl(this, publishableKey)
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
  createBillingPortalSession(params?: BillingPortalRequest): Promise<BillingPortalResponse> {
    return createBillingPortalSessionImpl(this, params)
  }
}

/** Create a PayClient instance with the given config */
export function createPayClient(config: PayClientConfig): PayClient {
  return new PayClient(config)
}
