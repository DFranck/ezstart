'use client'

/**
 * React Query hook — fetch subscriptions scoped by RBAC + optional userId.
 *
 * Peer dependencies: `@tanstack/react-query`.
 *
 * Migrated from the legacy `useState + useEffect + reload()` pattern so
 * that:
 *   - Cancel / refund mutations can invalidate the cache and re-render
 *     the dashboard automatically (no manual `reload()` propagation).
 *   - Stale data is served during revalidation (no skeleton flash on
 *     interval refresh).
 *
 * The return shape is a **compat surface** — it mimics the legacy
 * `{ subscriptions, isLoading, error, reload }` contract so existing
 * consumers (`PastDueBanner`, `UserPaymentDashboard`) keep working
 * without changes.
 *
 * @module @ezstart/pay-sdk/react/hooks/useSubscriptions
 */

import { useQuery } from '@tanstack/react-query'
import { usePayContext } from '../pay-provider.js'
import type { Payment } from '../../core/types.js'

/** Base query key — used by cancel / refund mutations for cache invalidation. */
export const SUBSCRIPTIONS_QUERY_KEY = ['pay', 'subscriptions'] as const

/**
 * Compute the query key for a given userId + pagination. Omitting all
 * params returns every subscription the current caller can see.
 */
export function subscriptionsQueryKey(params?: {
  userId?: string
  limit?: number
  offset?: number
}): readonly unknown[] {
  return [...SUBSCRIPTIONS_QUERY_KEY, params ?? {}] as const
}

export interface UseSubscriptionsParams {
  userId?: string
  limit?: number
  offset?: number
  /**
   * Toggle the query off (e.g. while the containing feature is hidden).
   * Legacy `autoLoad` alias — when `false` the query is disabled.
   */
  autoLoad?: boolean
  /** Modern `enabled` alias (wins over `autoLoad` when both are provided). */
  enabled?: boolean
}

export interface UseSubscriptionsResult {
  subscriptions: Payment[]
  isLoading: boolean
  error: string | null
  /** Force a refetch — invalidates the cache and re-fetches. */
  reload: () => Promise<unknown>
}

/**
 * Fetch the caller's subscriptions.
 *
 * @example
 * ```tsx
 * const { subscriptions, isLoading, error, reload } = useSubscriptions({ userId })
 * ```
 */
export function useSubscriptions(params: UseSubscriptionsParams = {}): UseSubscriptionsResult {
  const { client } = usePayContext()
  const { userId, limit = 10, offset = 0, autoLoad, enabled } = params
  const isEnabled = enabled ?? autoLoad ?? true

  const q = useQuery({
    queryKey: subscriptionsQueryKey({ userId, limit, offset }),
    queryFn: () => client.getSubscriptions({ userId, limit, offset }),
    enabled: isEnabled,
    staleTime: 30_000,
  })

  return {
    subscriptions: q.data?.payments ?? [],
    isLoading: q.isLoading,
    error: q.error instanceof Error ? q.error.message : q.error ? String(q.error) : null,
    reload: q.refetch,
  }
}
