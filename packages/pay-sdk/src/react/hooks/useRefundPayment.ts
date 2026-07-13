'use client'

/**
 * React Query mutation — refund a Stripe payment (admin only).
 *
 * Peer dependencies: `@tanstack/react-query`.
 *
 * On success, invalidates every query rooted at {@link SUBSCRIPTIONS_QUERY_KEY}
 * so `useSubscriptions` + `useSubscriptionStatus` re-fetch — the billing
 * dashboard reflects the refunded status without a manual reload.
 *
 * @module @ezstart/pay-sdk/react/hooks/useRefundPayment
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePayContext } from '../pay-provider.js'
import { SUBSCRIPTIONS_QUERY_KEY } from './useSubscriptions.js'

export interface UseRefundPaymentCallbacks {
  onSuccess?: (data: { success: boolean }) => void
  onError?: (error: Error) => void
}

/**
 * Refund a payment by its EZPay Payment id. Auto-invalidates every
 * `useSubscriptions` + `useSubscriptionStatus` cache entry on success.
 *
 * Note: the API requires an admin-scoped key or Bearer JWT — non-admin
 * callers will get a 403 surfaced through `onError`.
 *
 * @example
 * ```tsx
 * const refund = useRefundPayment({ onSuccess: () => toast('Refunded') })
 * refund.mutate('payment_abc123')
 * ```
 */
export function useRefundPayment(callbacks?: UseRefundPaymentCallbacks) {
  const { client } = usePayContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => client.refundPayment(paymentId),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...SUBSCRIPTIONS_QUERY_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
