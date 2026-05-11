/**
 * Shared HTTP helpers for the PayClient method modules.
 *
 * The PayClient orchestrator exposes a narrow `PayClientInternal` surface
 * (via bound accessors) so each domain module can:
 *   - Build the correct URL from `apiUrl`
 *   - Attach auth + API-key headers
 *   - Transparently retry once on 401 when `onTokenRefresh` is configured
 *   - Access the default `returnUrl` (explicit config > window.location)
 *
 * Keeping these helpers in a single module avoids duplicating the auth/401
 * logic across every domain file while staying strictly agnostic.
 */
import { parseApiError } from '@ezstart/api-sdk'
import type { PayClientConfig, Payment, PaymentsListResponse } from '../types/index.js'

/**
 * Internal surface exposed by the `PayClient` orchestrator to the method
 * modules. Everything a domain module needs to talk to the API is passed here
 * so the modules remain pure functions (no `this`, no class coupling).
 */
export interface PayClientInternal {
  readonly config: PayClientConfig
  /** Resolve return URL: explicit config > window.location origin > undefined */
  getReturnUrl(): string | undefined
  /** Build headers with optional Authorization bearer token and API key */
  getHeaders(extra?: Record<string, string>): Record<string, string>
  /**
   * Fetch with automatic 401 retry: when a request returns 401 and an
   * `onTokenRefresh` callback is configured, refresh the token and retry once.
   * If the refresh itself fails, invoke `onAuthFailure` (logout / redirect).
   */
  fetchWithAuth(url: string, options: RequestInit): Promise<Response>
  /**
   * Centralized list fetcher — normalizes API response { success, data, meta }
   * into { payments, total } format expected by hooks.
   */
  fetchList(
    path: string,
    params?: Record<string, string | number | undefined>,
    options?: { signal?: AbortSignal }
  ): Promise<PaymentsListResponse>
}

/** Build the default return URL from config or `window.location`. */
export function resolveReturnUrl(config: PayClientConfig): string | undefined {
  return (
    config.returnUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : undefined)
  )
}

/** Build headers with optional Authorization bearer token and X-API-Key. */
export function buildHeaders(
  config: PayClientConfig,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey
  }
  const token = config.getToken?.()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/** `fetch()` + automatic one-shot 401 retry via `onTokenRefresh`. */
export async function fetchWithAuth(
  config: PayClientConfig,
  url: string,
  options: RequestInit
): Promise<Response> {
  let response = await fetch(url, options)

  if (response.status === 401 && config.onTokenRefresh) {
    try {
      const newToken = await config.onTokenRefresh()
      if (newToken) {
        const retryHeaders = new Headers(options.headers)
        retryHeaders.set('Authorization', `Bearer ${newToken}`)
        response = await fetch(url, { ...options, headers: retryHeaders })
      }
    } catch {
      config.onAuthFailure?.()
      return response
    }
  }

  // If still 401 after retry (or no refresh callback), signal auth failure
  if (response.status === 401) {
    config.onAuthFailure?.()
  }

  return response
}

/**
 * Centralized list fetcher used by donations/purchases/subscriptions/payments
 * routes. Normalises the `{ success, data, meta }` envelope into the
 * `{ payments, total }` shape expected by the hooks.
 */
export async function fetchList(
  client: PayClientInternal,
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: { signal?: AbortSignal }
): Promise<PaymentsListResponse> {
  const searchParams = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') searchParams.set(key, String(value))
    }
  }

  const url = `${client.config.apiUrl}/api/${path}?${searchParams.toString()}`
  const response = await client.fetchWithAuth(url, {
    headers: client.getHeaders(),
    signal: options?.signal,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(parseApiError(result) ?? `Failed to fetch ${path}`)
  }

  // Normalize: API returns { success, data, meta } → { payments, total }
  const rawList = result.data || result.payments || []
  const payments = rawList.map((p: Payment & { _id?: string }) => ({
    ...p,
    id: p.id || p._id,
  }))

  return { success: true, payments, total: result.meta?.total ?? payments.length }
}
