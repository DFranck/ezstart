import type {
  CreatePromoRequest,
  PromoResponse,
  PromosListResponse,
  PromoValidationResponse,
  UpdatePromoRequest,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

export async function createPromo(
  client: PayClientInternal,
  data: CreatePromoRequest
): Promise<PromoResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/promos`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create promo')
  }

  return result.data ?? result
}

export interface ListPromosParams {
  /** @deprecated Use `applicationId` instead. */
  appName?: string
  applicationId?: string
  active?: boolean
  limit?: number
  offset?: number
}

export async function listPromos(
  client: PayClientInternal,
  params?: ListPromosParams
): Promise<PromosListResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') searchParams.set(key, String(value))
    }
  }

  const response = await client.fetchWithAuth(
    `${client.config.apiUrl}/api/promos?${searchParams.toString()}`,
    { headers: client.getHeaders() }
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

export async function validatePromo(
  client: PayClientInternal,
  code: string,
  appName: string
): Promise<PromoValidationResponse> {
  const searchParams = new URLSearchParams({ appName })

  // Public validation endpoint — no auth needed, use raw fetch.
  const response = await fetch(
    `${client.config.apiUrl}/api/promos/validate/${encodeURIComponent(code)}?${searchParams.toString()}`,
    { headers: client.getHeaders() }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to validate promo')
  }

  return result
}

export async function updatePromo(
  client: PayClientInternal,
  promoId: string,
  data: UpdatePromoRequest
): Promise<PromoResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/promos/${promoId}`, {
    method: 'PATCH',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update promo')
  }

  return result.data ?? result
}

export async function deletePromo(
  client: PayClientInternal,
  promoId: string
): Promise<{ success: boolean }> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/promos/${promoId}`, {
    method: 'DELETE',
    headers: client.getHeaders(),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete promo')
  }

  return result
}
