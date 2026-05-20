'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import { deriveSubscriptionStatus } from '../../core/derive-subscription-status.js'
import type { Payment, SubscriptionStatusSnapshot } from '../../core/types.js'

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
   * billing state on the very first paint — the `useEffect` fetch then becomes
   * a revalidation-only fallback (no skeleton flash). When provided, `loading`
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

export function useSubscriptionStatus(params: UseSubscriptionStatusParams): SubscriptionStatus {
  const { client, applicationId: ctxApplicationId, appSlug: ctxAppSlug } = usePayContext()

  // Hydrate synchronously from the SSR snapshot when provided; otherwise start
  // in the `loading` state.
  const [status, setStatus] = useState<SubscriptionStatus>(() =>
    params.initialStatus
      ? snapshotToStatus(params.initialStatus)
      : {
          loading: true,
          isActive: false,
          isTrialing: false,
          isCanceling: false,
          plan: null,
          features: [],
          periodEnd: null,
          subscription: null,
        }
  )

  const effectiveApplicationId = params.applicationId ?? ctxApplicationId ?? undefined
  const effectiveAppName =
    params.appName ?? (effectiveApplicationId ? undefined : (ctxAppSlug ?? undefined))

  const load = useCallback(async () => {
    if (!params.userId) {
      setStatus(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      const res = await client.getSubscriptions({ userId: params.userId, limit: 1 })
      const payments = res.payments || []
      const activeSub = payments.find(p => p.status === 'completed' && p.type === 'subscription')

      // Resolve plan features only when the metadata snapshot is empty —
      // mirrors the server companion's best-effort lookup.
      let plans = undefined
      const metaFeatures = (activeSub?.metadata?.features as string[] | undefined) ?? []
      if (activeSub && metaFeatures.length === 0) {
        try {
          const plansRes = await client.listPlans({
            applicationId: effectiveApplicationId,
            appName: effectiveAppName,
            active: true,
          })
          plans = plansRes.data || []
        } catch {
          // Plan lookup is best-effort
        }
      }

      const snapshot = deriveSubscriptionStatus(payments, plans)
      setStatus(snapshotToStatus(snapshot))
    } catch {
      setStatus(prev => ({ ...prev, loading: false }))
    }
  }, [client, params.userId, effectiveApplicationId, effectiveAppName])

  // When hydrated from an SSR snapshot, `loading` already started `false`, so
  // the revalidation `load()` swaps data in place without a skeleton flash.
  // Without a snapshot it runs as the primary fetch (loading → done).
  useEffect(() => {
    void load()
  }, [load])

  return status
}
