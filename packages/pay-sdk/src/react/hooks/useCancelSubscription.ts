'use client'

/**
 * React Query mutation — cancel a Stripe subscription.
 *
 * Peer dependencies: `@tanstack/react-query`.
 *
 * On success, invalidates every query rooted at {@link SUBSCRIPTIONS_QUERY_KEY}
 * so `useSubscriptions` + `useSubscriptionStatus` (which share the same key
 * namespace) re-fetch — the billing dashboard reflects the "canceling at
 * period end" state without a manual page refresh.
 *
 * @module @ezstart/pay-sdk/react/hooks/useCancelSubscription
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePayContext } from '../pay-provider.js'
import { SUBSCRIPTIONS_QUERY_KEY } from './useSubscriptions.js'

export interface UseCancelSubscriptionCallbacks {
  onSuccess?: (data: { success: boolean }) => void
  onError?: (error: Error) => void
}

/**
 * Cancel a subscription (Stripe subscription id, `sub_…`). Auto-invalidates
 * every `useSubscriptions` + `useSubscriptionStatus` cache entry on success.
 *
 * @example
 * ```tsx
 * const cancel = useCancelSubscription({ onSuccess: () => toast('Cancelled') })
 * cancel.mutate('sub_abc123')
 * ```
 */
export function useCancelSubscription(callbacks?: UseCancelSubscriptionCallbacks) {
  const { client } = usePayContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subscriptionId: string) => client.cancelSubscription(subscriptionId),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...SUBSCRIPTIONS_QUERY_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
