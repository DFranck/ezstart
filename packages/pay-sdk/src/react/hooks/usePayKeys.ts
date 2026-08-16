'use client'

/**
 * React Query hook — fetch EZPay API keys for the current user.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/pay-sdk/react/hooks/usePayKeys
 */

import { apiCall } from '@ezstart/api-sdk'
import { useQuery } from '@tanstack/react-query'
import type { PayApiKeyItem } from '../../core/types.js'

/** Base query key — also used for cache invalidation by the mutation hooks. */
export const PAY_KEYS_QUERY_KEY = ['pay-api-keys'] as const

/**
 * Compute the query key for a given application scope. Omitting
 * `applicationId` returns every EZPay key the user owns.
 */
export function payKeysQueryKey(applicationId?: string): readonly unknown[] {
  return applicationId
    ? ([...PAY_KEYS_QUERY_KEY, { applicationId }] as const)
    : (PAY_KEYS_QUERY_KEY as readonly unknown[])
}

export interface UsePayKeysOptions {
  /** When provided, only keys scoped to that Application are returned. */
  applicationId?: string
  /** Toggle the query off (e.g. while the user is unauthenticated). */
  enabled?: boolean
}

/**
 * Fetch the current user's EZPay API keys, optionally scoped to a single
 * Application.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = usePayKeys({ applicationId: 'app_123' })
 * ```
 */
export function usePayKeys(options: UsePayKeysOptions = {}) {
  const { applicationId, enabled = true } = options
  return useQuery({
    queryKey: payKeysQueryKey(applicationId),
    queryFn: () =>
      apiCall<PayApiKeyItem[]>('/keys', {
        appName: 'ezpay',
        method: 'GET',
        query: applicationId ? { applicationId } : undefined,
      }),
    enabled,
  })
}
