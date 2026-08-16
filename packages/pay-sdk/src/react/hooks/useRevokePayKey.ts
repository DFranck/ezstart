'use client'

/**
 * React Query mutation — revoke (soft-delete) an EZPay API key.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/pay-sdk/react/hooks/useRevokePayKey
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PAY_KEYS_QUERY_KEY } from './usePayKeys.js'

export interface UseRevokePayKeyCallbacks {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Mutation to revoke an EZPay API key. Automatically invalidates the
 * {@link usePayKeys} query on success.
 *
 * @example
 * ```tsx
 * const revoke = useRevokePayKey({ onSuccess: () => toast.success('Revoked') })
 * revoke.mutate('key_abc')
 * ```
 */
export function useRevokePayKey(callbacks?: UseRevokePayKeyCallbacks) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiCall(`/keys/${id}`, {
        appName: 'ezpay',
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PAY_KEYS_QUERY_KEY] })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
