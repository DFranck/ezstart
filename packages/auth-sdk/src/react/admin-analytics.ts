'use client'

/**
 * React Query hook for the platform analytics overview (superadmin only).
 *
 * Federated-admin friendly: accepts an optional `apiUrl` + `authToken` pair
 * so the hook can be used from a Tier 3 hub (ezstart) embedding the auth
 * SDK against an off-origin EZAuth deployment with a different bearer
 * token than the local `useAuthStore` session token.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/auth-sdk/react/admin-analytics
 */

import { apiCall } from '@ezstart/api-sdk'
import { useQuery } from '@tanstack/react-query'
import type { AdminAnalyticsOverview } from '../core/types.js'

interface UseAdminAnalyticsOptions {
  /**
   * Override the EZAuth API base URL. Required for **federated admin**
   * (Tier 3 hub embeds the SDK cross-origin). When omitted, the call goes
   * to the URL resolved by the surrounding `<AuthProvider>`.
   *
   * @example 'https://auth.example.com'
   */
  apiUrl?: string
  /**
   * Override the bearer token used for the request. Required when the local
   * session token differs from the platform-wide superadmin JWT.
   */
  authToken?: string | (() => string | Promise<string>)
  /** Toggle the query — defaults to `true`. */
  enabled?: boolean
  /**
   * Auto-refresh interval in ms. Set to `0` to disable. Defaults to `0`
   * (no polling — the analytics overview is computed on-demand).
   */
  refetchIntervalMs?: number
}

/** Cache key for the overview query. Single-tenant — no params. */
const ADMIN_ANALYTICS_KEY = ['admin', 'analytics', 'overview'] as const

/**
 * Fetch the platform analytics overview from EZAuth.
 *
 * Returns the same payload shape as `coreAuthClient.getAdminAnalyticsOverview`
 * but cached + reactive via TanStack Query. Caller must ensure the active
 * user has the `superadmin` global role — the API returns 403 otherwise.
 *
 * @example Standalone (uses surrounding AuthProvider)
 * ```tsx
 * const { data, isLoading } = useAdminAnalyticsOverview()
 * ```
 *
 * @example Federated admin (Tier 3 hub embedding cross-origin)
 * ```tsx
 * const { data } = useAdminAnalyticsOverview({
 *   apiUrl: 'https://auth.example.com',
 *   authToken: () => superadminJwt,
 * })
 * ```
 */
export function useAdminAnalyticsOverview(options: UseAdminAnalyticsOptions = {}) {
  const { apiUrl, authToken, enabled = true, refetchIntervalMs = 0 } = options

  return useQuery({
    queryKey: ADMIN_ANALYTICS_KEY,
    queryFn: () =>
      apiCall<AdminAnalyticsOverview>('/admin/analytics/overview', {
        appName: 'ezauth',
        method: 'GET',
        ...(apiUrl ? { baseUrl: apiUrl } : {}),
        ...(authToken !== undefined ? { getToken: toGetToken(authToken) } : {}),
      }),
    enabled,
    ...(refetchIntervalMs > 0 ? { refetchInterval: refetchIntervalMs } : {}),
  })
}

function toGetToken(value: string | (() => string | Promise<string>)) {
  return async (): Promise<string | null> => {
    const v = typeof value === 'function' ? await value() : value
    return v || null
  }
}
