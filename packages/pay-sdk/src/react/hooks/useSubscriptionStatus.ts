'use client'

/**
 * React Query hook — derive the caller's current subscription status.
 *
 * Migrated to `useQuery` so that cancel / refund mutations invalidate the
 * cache and this hook re-derives the status automatically (previously the
 * dashboard showed a stale "Current plan" after cancel until manual reload).
 *
 * The return shape is preserved so `BillingDashboard`, `PricingPage`, and
 * `FeatureGate` keep working without changes.
 *
 * @module @ezstart/pay-sdk/react/hooks/useSubscriptionStatus
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePayContext } from '../pay-provider.js'
import { deriveSubscriptionStatus } from '../../core/derive-subscription-status.js'
import type { Payment, SubscriptionStatusSnapshot } from '../../core/types.js'
import { subscriptionsQueryKey } from './useSubscriptions.js'

interface SubscriptionStatus {
  loading: boolean
  /** Has an active subscription */
  isActive: boolean
  /** Subscription is in a free trial period */
  isTrialing: boolean
  /** Cancel requested but still active until period end */
  isCanceling: boolean
  /** Plan name from subscription metadata */
  plan: string | null
  /** Features from the matched plan */
  features: string[]
  /** When the current billing period ends */
  periodEnd: Date | null
  /** The raw subscription payment record */
  subscription: Payment | null
}

interface UseSubscriptionStatusParams {
  userId?: string
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id (preferred). Falls back to `appName` / context when absent. */
  applicationId?: string
  /**
   * SSR-resolved subscription snapshot used to hydrate the hook synchronously
   * at mount. Pass the result of `getServerSubscriptionStatus()` (from
   * `@ezstart/pay-sdk/server`) so `<BillingDashboard>` renders the correct
   * billing state on the very first paint — the client query then becomes a
   * revalidation-only fallback (no skeleton flash). When provided, `loading`
   * starts `false`.
   */
  initialStatus?: SubscriptionStatusSnapshot
}

/** Map the serializable SSR snapshot onto the runtime hook shape. */
function snapshotToStatus(snapshot: SubscriptionStatusSnapshot): SubscriptionStatus {
  return {
    loading: false,
    isActive: snapshot.isActive,
    isTrialing: snapshot.isTrialing,
    isCanceling: snapshot.isCanceling,
    plan: snapshot.plan,
    features: snapshot.features,
    periodEnd: snapshot.periodEnd ? new Date(snapshot.periodEnd) : null,
    subscription: snapshot.subscription,
  }
}

const EMPTY_STATUS: SubscriptionStatus = {
  loading: true,
  isActive: false,
  isTrialing: false,
  isCanceling: false,
  plan: null,
  features: [],
  periodEnd: null,
  subscription: null,
}

export function useSubscriptionStatus(params: UseSubscriptionStatusParams): SubscriptionStatus {
  const { client, applicationId: ctxApplicationId, appSlug: ctxAppSlug } = usePayContext()

  const effectiveApplicationId = params.applicationId ?? ctxApplicationId ?? undefined
  const effectiveAppName =
    params.appName ?? (effectiveApplicationId ? undefined : (ctxAppSlug ?? undefined))

  // Share the same query key namespace as `useSubscriptions` so the mutation
  // hooks (`useCancelSubscription`, `useRefundPayment`) invalidate BOTH the
  // list view and the status card with a single `invalidateQueries` call.
  const paymentsQuery = useQuery({
    queryKey: subscriptionsQueryKey({ userId: params.userId, limit: 1, offset: 0 }),
    queryFn: () => client.getSubscriptions({ userId: params.userId, limit: 1 }),
    enabled: !!params.userId,
    staleTime: 30_000,
    // Seed the cache from the SSR snapshot when provided so the first render
    // matches server output byte-for-byte (no skeleton flash on hydration).
    initialData: params.initialStatus?.subscription
      ? { success: true, payments: [params.initialStatus.subscription], total: 1 }
      : undefined,
  })

  // Plan features lookup — only when the subscription metadata snapshot is
  // empty (mirror of the previous inline behaviour + the server companion).
  const activeSub = paymentsQuery.data?.payments.find(
    p => p.status === 'completed' && p.type === 'subscription'
  )
  const metaFeatures = (activeSub?.metadata?.features as string[] | undefined) ?? []
  const shouldFetchPlans = !!activeSub && metaFeatures.length === 0

  const plansQuery = useQuery({
    queryKey: [
      'pay',
      'plans',
      { applicationId: effectiveApplicationId, appName: effectiveAppName, active: true },
    ],
    queryFn: () =>
      client.listPlans({
        applicationId: effectiveApplicationId,
        appName: effectiveAppName,
        active: true,
      }),
    enabled: shouldFetchPlans,
    staleTime: 60_000,
  })

  return useMemo<SubscriptionStatus>(() => {
    if (!params.userId) {
      return { ...EMPTY_STATUS, loading: false }
    }
    if (paymentsQuery.isLoading && !params.initialStatus) {
      return EMPTY_STATUS
    }
    const payments = paymentsQuery.data?.payments ?? []
    const plans = plansQuery.data?.data
    const snapshot = deriveSubscriptionStatus(payments, plans ?? undefined)
    return snapshotToStatus(snapshot)
  }, [
    params.userId,
    params.initialStatus,
    paymentsQuery.data,
    paymentsQuery.isLoading,
    plansQuery.data,
  ])
}
