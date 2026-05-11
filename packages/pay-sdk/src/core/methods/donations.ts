import { parseApiError } from '@ezstart/api-sdk'
import type {
  CreateDonationRequest,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

export async function createDonation(
  client: PayClientInternal,
  data: CreateDonationRequest
): Promise<PaymentResponse> {
  const returnUrl = client.getReturnUrl()

  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/donate`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...data, returnUrl }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to create donation')
  }

  // Unwrap standard { success, data } response
  return result.data ?? result
}

export function getDonations(
  client: PayClientInternal,
  params?: { projectId?: string; limit?: number }
): Promise<PaymentsListResponse> {
  return client.fetchList('donations', params)
}

export async function getDonationStats(
  client: PayClientInternal,
  projectId?: string
): Promise<StatsResponse> {
  const searchParams = new URLSearchParams()
  if (projectId) searchParams.set('projectId', projectId)

  const response = await client.fetchWithAuth(
    `${client.config.apiUrl}/api/donations/stats?${searchParams.toString()}`,
    { headers: client.getHeaders() }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to fetch donation stats')
  }

  return result
}
