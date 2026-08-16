'use client'

/**
 * React Query hook — fetch usage stats for a single EZPay API key.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/pay-sdk/react/hooks/usePayKeyUsage
 */

import { apiCall } from '@ezstart/api-sdk'
import { useQuery } from '@tanstack/react-query'
import type { PayApiKeyUsageResponse } from '../../core/types.js'

/** Query key for a single key's usage snapshot. */
export function payKeyUsageQueryKey(keyId: string): readonly unknown[] {
  return ['pay-api-key-usage', keyId] as const
}

export interface UsePayKeyUsageOptions {
  /** Toggle the query off (defaults to `true` when `keyId` is present). */
  enabled?: boolean
}

/**
 * Fetch usage stats for a specific EZPay API key.
 *
 * @example
 * ```tsx
 * const { data } = usePayKeyUsage('key_abc', { enabled: !!selectedKeyId })
 * ```
 */
export function usePayKeyUsage(keyId: string | null, options: UsePayKeyUsageOptions = {}) {
  const { enabled = true } = options
  return useQuery({
    queryKey: payKeyUsageQueryKey(keyId ?? ''),
    queryFn: () =>
      apiCall<PayApiKeyUsageResponse>(`/keys/${keyId}/usage`, {
        appName: 'ezpay',
        method: 'GET',
      }),
    enabled: !!keyId && enabled,
  })
}
