import { parseApiError } from '@ezstart/api-sdk'
import type {
  CreatePlanRequest,
  PlanResponse,
  PlansListResponse,
  UpdatePlanRequest,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

export async function createPlan(
  client: PayClientInternal,
  data: CreatePlanRequest
): Promise<PlanResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/plans`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to create plan')
  }

  return result.data ?? result
}

export interface ListPlansParams {
  /** @deprecated Use `applicationId` instead. */
  appName?: string
  applicationId?: string
  active?: boolean
  limit?: number
  offset?: number
}

export async function listPlans(
  client: PayClientInternal,
  params?: ListPlansParams
): Promise<PlansListResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') searchParams.set(key, String(value))
    }
  }

  // Public endpoint — no auth needed, but include token if available
  const url = `${client.config.apiUrl}/api/plans?${searchParams.toString()}`
  const response = await fetch(url, { headers: client.getHeaders() })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to list plans')
  }

  // Map MongoDB _id to id for SDK type compatibility
  const data = result.data ?? result.plans ?? []
  const plans = data.map((p: Record<string, unknown>) => ({
    ...p,
    id: p.id || p._id,
  }))

  return { ...result, data: plans }
}

export async function updatePlan(
  client: PayClientInternal,
  planId: string,
  data: UpdatePlanRequest
): Promise<PlanResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/plans/${planId}`, {
    method: 'PATCH',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to update plan')
  }

  return result.data ?? result
}

export async function deletePlan(
  client: PayClientInternal,
  planId: string
): Promise<{ success: boolean }> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/plans/${planId}`, {
    method: 'DELETE',
    headers: client.getHeaders(),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? 'Failed to delete plan')
  }

  return result
}
