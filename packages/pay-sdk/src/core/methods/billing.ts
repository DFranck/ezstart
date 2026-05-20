import { payErrorFromResponse } from '../errors.js'
import type {
  ApplicationConfigResponse,
  BillingPortalRequest,
  BillingPortalResponse,
} from '../types/index.js'
import type { PayClientInternal } from './http.js'

/**
 * Resolve the EZPay Application a publishable key belongs to.
 *
 * Calls the public `GET /api/keys/config?key=<publishableKey>` endpoint and
 * returns the `{ applicationId, appSlug, apiUrl, webUrl, type, env, scope }`
 * payload. No auth required — the key IS the auth.
 */
export async function resolveApplicationByKey(
  client: PayClientInternal,
  publishableKey: string
): Promise<ApplicationConfigResponse> {
  if (!publishableKey) {
    throw new Error('publishableKey is required to resolve application config')
  }

  const url = `${client.config.apiUrl}/api/keys/config?key=${encodeURIComponent(publishableKey)}`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })

  const result = await response.json()

  if (!response.ok) {
    throw payErrorFromResponse(
      result,
      response.status,
      `Failed to resolve application (${response.status})`
    )
  }

  // Endpoint always wraps as `{ success: true, data: {...} }` — unwrap.
  const payload: ApplicationConfigResponse = result?.data ?? result
  if (!payload?.applicationId || !payload?.appSlug) {
    throw new Error('Invalid application config response: missing applicationId or appSlug')
  }

  return payload
}

/**
 * Create a Stripe Customer Portal session for the authenticated user.
 *
 * When `customerId` is omitted, the API resolves the Stripe customer from
 * the user's most recent subscription payment. The returned `url` is a
 * short-lived Stripe-hosted link — redirect the user there.
 */
export async function createBillingPortalSession(
  client: PayClientInternal,
  params?: BillingPortalRequest
): Promise<BillingPortalResponse> {
  const response = await client.fetchWithAuth(`${client.config.apiUrl}/api/billing/portal`, {
    method: 'POST',
    headers: client.getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params ?? {}),
  })

  const result = await response.json()

  if (!response.ok) {
    throw payErrorFromResponse(result, response.status, 'Failed to create billing portal session')
  }

  return result.data ?? result
}
