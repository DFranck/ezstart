import { getApiUrl } from '@ezstart/config/urls'
import type { ApiError, ApiResponse, CallApiOptions } from './types'

/**
 * Type-safe HTTP client for @ezstart monorepo
 *
 * Features:
 * - Automatic URL resolution from @ezstart/config
 * - Automatic /api prefix normalization
 * - JSON body serialization
 * - Error handling with detailed logging
 * - AbortSignal support for cancellation
 *
 * @example
 * ```ts
 * // GET request
 * const response = await callApi<User[]>('/users', { appName: 'ezbill' })
 *
 * // POST request
 * const response = await callApi<User>('/users', {
 *   appName: 'ezbill',
 *   method: 'POST',
 *   body: { name: 'John', email: 'john@example.com' }
 * })
 *
 * // With query params
 * const response = await callApi<Invoice[]>('/invoices', {
 *   appName: 'ezbill',
 *   query: { status: 'paid', limit: 10 }
 * })
 * ```
 */
export async function callApi<T = any>(
  endpoint: string,
  options: CallApiOptions
): Promise<ApiResponse<T>> {
  const { method = 'GET', query, body, headers = {}, signal, userId, appName } = options

  // Resolve base URL from @ezstart/config
  const baseUrl = getApiUrl(appName)

  // Normalize endpoint: ensure /api prefix
  const normalizedEndpoint = endpoint.startsWith('/api/')
    ? endpoint.slice(4)
    : endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`

  let url = `${baseUrl}/api${normalizedEndpoint}`

  // Append query parameters
  if (query && Object.keys(query).length > 0) {
    const q = new URLSearchParams(query).toString()
    url += url.includes('?') ? `&${q}` : `?${q}`
  }

  // Determine body type
  const isFormUrlEncoded = body instanceof URLSearchParams
  const isStringBody = typeof body === 'string'
  const isJsonBody = !isFormUrlEncoded && !isStringBody

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...headers,
      },
      body: isFormUrlEncoded ? body : isStringBody ? body : body ? JSON.stringify(body) : undefined,
      signal,
    })

    // Parse response body
    let data: T | ApiError | null = null
    try {
      data = await res.json()
    } catch {
      // Non-JSON response (e.g., 204 No Content)
      data = null
    }

    if (res.ok) {
      return {
        ok: true as const,
        status: res.status,
        url: res.url,
        data: data as T,
      }
    } else {
      // Log error details for debugging
      console.warn('[callApi] API returned !ok')
      console.warn('[callApi] Method:', method)
      console.warn('[callApi] URL:', url)
      console.warn('[callApi] Status:', res.status)
      console.warn('[callApi] Body:', body)
      console.warn('[callApi] Headers:', headers)
      console.warn('[callApi] Query:', query)
      console.warn('[callApi] Response:', data)

      return {
        ok: false as const,
        status: res.status,
        url: res.url,
        data: data as ApiError | null,
      }
    }
  } catch (err) {
    // Network error or request failed
    console.error('[callApi] Fetch failed:', err)
    console.error('[callApi] Endpoint:', endpoint)
    console.error('[callApi] Body:', body)
    console.error('[callApi] Query:', query)

    return {
      status: 0,
      ok: false,
      url,
      data: { error: 'Fetch failed', reason: (err as Error).message },
    }
  }
}
