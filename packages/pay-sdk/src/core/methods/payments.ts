import { parseApiError } from '@ezstart/api-sdk'
import type { GetPaymentsParams, Payment, PaymentsListResponse } from '../types/index.js'
import type { PayClientInternal } from './http.js'

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
 */
export function getPayments(
  client: PayClientInternal,
  params?: GetPaymentsParams
): Promise<PaymentsListResponse> {
  const merged: Record<string, string | number | undefined> = {
    userId: params?.userId,
    projectId: params?.projectId,
    applicationId: params?.applicationId,
    limit: params?.limit,
    offset: params?.offset,
    type: params?.type,
    status: params?.status,
    liveMode: params?.liveMode,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    scope: params?.scope,
  }
  if (merged.applicationId === undefined && client.config.applicationId) {
    merged.applicationId = client.config.applicationId
  }
  // Empty string → caller explicitly opted out of scoping; drop before sending.
  if (merged.applicationId === '') {
    merged.applicationId = undefined
  }
  return client.fetchList('payments', merged, { signal: params?.signal })
}

export async function getPayment(client: PayClientInternal, paymentId: string): Promise<Payment> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/payments/${paymentId}`, {
    headers: client.getHeaders(),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to fetch payment')
  }

  return result.payment
}

export async function refundPayment(
  client: PayClientInternal,
  paymentId: string
): Promise<{ success: boolean }> {
  const response = await client.fetchWithAuth(
    `${client.config.apiUrl}/api/payments/${paymentId}/refund`,
    {
      method: 'POST',
      headers: client.getHeaders(),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to refund payment')
  }

  return result
}

export function getMyPayments(
  client: PayClientInternal,
  params?: { type?: string; status?: string; limit?: number; offset?: number }
): Promise<PaymentsListResponse> {
  return client.fetchList('payments/me', params)
}

export async function cleanupPayments(
  client: PayClientInternal,
  appName?: string
): Promise<{ deletedCount: number }> {
  const qs = appName ? `?appName=${appName}` : ''
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/payments/cleanup${qs}`, {
    method: 'DELETE',
    headers: client.getHeaders(),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(parseApiError(result) ?? 'Failed to cleanup')
  return result.data ?? result
}
