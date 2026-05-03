import type {
  ChangePlanRequest,
  ChangePlanResponse,
  CreateSubscriptionRequest,
  PaymentResponse,
  PaymentsListResponse,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

export async function createSubscription(
  client: PayClientInternal,
  data: CreateSubscriptionRequest
): Promise<PaymentResponse> {
  const returnUrl = client.getReturnUrl()

  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/subscribe`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...data, returnUrl }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create subscription')
  }

  // Unwrap standard { success, data } response
  return result.data ?? result
}

export interface GetSubscriptionsParams {
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
}

export function getSubscriptions(
  client: PayClientInternal,
  params?: GetSubscriptionsParams
): Promise<PaymentsListResponse> {
  const merged: Record<string, string | number | undefined> = {
    userId: params?.userId,
    projectId: params?.projectId,
    limit: params?.limit,
    offset: params?.offset,
    liveMode: params?.liveMode,
    scope: params?.scope,
  }
  return client.fetchList('subscriptions', merged)
}

export async function cancelSubscription(
  client: PayClientInternal,
  subscriptionId: string
): Promise<{ success: boolean }> {
  const response = await client.fetchWithAuth(
    `${client.config.apiUrl}/api/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: client.getHeaders(),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to cancel subscription')
  }

  return result
}

/**
 * Change the plan on an active subscription (upgrade / downgrade).
 *
 * Calls `POST /subscriptions/:id/change-plan` which swaps the Stripe Price
 * on the subscription item using the provided proration behaviour.
 */
export async function changeSubscriptionPlan(
  client: PayClientInternal,
  subscriptionId: string,
  data: ChangePlanRequest
): Promise<ChangePlanResponse> {
  const response = await client.fetchWithAuth(
    `${client.config.apiUrl}/api/subscriptions/${subscriptionId}/change-plan`,
    {
      method: 'POST',
      headers: client.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to change subscription plan')
  }

  return result.data ?? result
}
