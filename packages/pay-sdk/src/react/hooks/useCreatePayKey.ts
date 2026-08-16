'use client'

/**
 * React Query mutation — create a new EZPay API key scoped to an Application.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/pay-sdk/react/hooks/useCreatePayKey
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreatePayApiKeyRequest, CreatePayApiKeyResponse } from '../../core/types.js'
import { PAY_KEYS_QUERY_KEY } from './usePayKeys.js'

export interface UseCreatePayKeyCallbacks {
  onSuccess?: (data: CreatePayApiKeyResponse) => void
  onError?: (error: Error) => void
}

/**
 * Mutation to create a new EZPay API key. Automatically invalidates the
 * {@link usePayKeys} query on success.
 *
 * @example
 * ```tsx
 * const create = useCreatePayKey({ onSuccess: (data) => setRawKey(data.key) })
 * create.mutate({ name: 'Prod', applicationId: 'app_123', type: 'publishable' })
 * ```
 */
export function useCreatePayKey(callbacks?: UseCreatePayKeyCallbacks) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePayApiKeyRequest) =>
      apiCall<CreatePayApiKeyResponse>('/keys', {
        appName: 'ezpay',
        method: 'POST',
        body,
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
