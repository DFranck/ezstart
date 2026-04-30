import type {
  ConnectDashboardLinkResponse,
  ConnectOnboardRequest,
  ConnectOnboardResponse,
  ConnectResumeRequest,
  ConnectResumeResponse,
  ConnectStatusResponse,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

export async function getConnectStatus(
  client: PayClientInternal,
  params?: { applicationId?: string }
): Promise<ConnectStatusResponse> {
  const query = params?.applicationId
    ? `?applicationId=${encodeURIComponent(params.applicationId)}`
    : ''
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/connect/status${query}`, {
    headers: client.getHeaders(),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch connect status')
  }

  return result.data ?? result
}

export async function connectOnboard(
  client: PayClientInternal,
  data: ConnectOnboardRequest
): Promise<ConnectOnboardResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/connect/onboard`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to start onboarding')
  }

  return result.data ?? result
}

export async function getConnectDashboardLink(
  client: PayClientInternal
): Promise<ConnectDashboardLinkResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/connect/dashboard-link`, {
    headers: client.getHeaders(),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to get dashboard link')
  }

  return result.data ?? result
}

/**
 * Resume an in-progress Stripe Connect onboarding (status='pending' AND
 * createdAt < 7 days). Returns a fresh Stripe `accountLinks.create` URL
 * the caller redirects the user to.
 *
 * Throws if the row is not pending, expired (>7d), or not owned by the caller.
 */
export async function connectResume(
  client: PayClientInternal,
  data: ConnectResumeRequest
): Promise<ConnectResumeResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/connect/onboarding/resume`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to resume onboarding')
  }

  return result.data ?? result
}

export async function disconnectAccount(client: PayClientInternal): Promise<{ success: boolean }> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/connect/disconnect`, {
    method: 'DELETE',
    headers: client.getHeaders(),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to disconnect account')
  }

  return result
}
