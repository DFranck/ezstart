'use client'

/**
 * React Query mutation — rotate an EZPay API key (revoke the old one and
 * return a fresh raw key atomically).
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/pay-sdk/react/hooks/useRotatePayKey
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreatePayApiKeyResponse } from '../../core/types.js'
import { PAY_KEYS_QUERY_KEY } from './usePayKeys.js'

export interface UseRotatePayKeyCallbacks {
  onSuccess?: (data: CreatePayApiKeyResponse) => void
  onError?: (error: Error) => void
}

/**
 * Mutation to rotate an EZPay API key. Returns a fresh raw key that must be
 * surfaced to the user exactly once.
 *
 * @example
 * ```tsx
 * const rotate = useRotatePayKey({ onSuccess: (data) => setRawKey(data.key) })
 * rotate.mutate('key_abc')
 * ```
 */
export function useRotatePayKey(callbacks?: UseRotatePayKeyCallbacks) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<CreatePayApiKeyResponse>(`/keys/${id}/rotate`, {
        appName: 'ezpay',
        method: 'POST',
      }),
    onSuccess: (data: CreatePayApiKeyResponse) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_KEYS_QUERY_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
