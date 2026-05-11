import { parseApiError } from '@ezstart/api-sdk'
import type {
  CreatePurchaseRequest,
  PaymentResponse,
  PaymentsListResponse,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

export async function createPurchase(
  client: PayClientInternal,
  data: CreatePurchaseRequest
): Promise<PaymentResponse> {
  const returnUrl = client.getReturnUrl()

  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/purchase`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...data, returnUrl }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to create purchase')
  }

  // Unwrap standard { success, data } response
  return result.data ?? result
}

export function getPurchases(
  client: PayClientInternal,
  params?: { userId?: string; limit?: number; offset?: number }
): Promise<PaymentsListResponse> {
  return client.fetchList('purchases', params)
}
