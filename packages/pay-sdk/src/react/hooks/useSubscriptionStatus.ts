'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { Payment } from '../../core/types.js'

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
}

export function useSubscriptionStatus(params: UseSubscriptionStatusParams): SubscriptionStatus {
  const { client, applicationId: ctxApplicationId, appSlug: ctxAppSlug } = usePayContext()
  const [status, setStatus] = useState<SubscriptionStatus>({
    loading: true,
    isActive: false,
    isTrialing: false,
    isCanceling: false,
    plan: null,
    features: [],
    periodEnd: null,
    subscription: null,
  })

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
      const activeSub = (res.payments || []).find(
        p => p.status === 'completed' && p.type === 'subscription'
      )

      if (!activeSub) {
        setStatus(prev => ({ ...prev, loading: false }))
        return
      }

      // Priority: snapshot from payment metadata > current plan
      let features: string[] = (activeSub.metadata?.features as string[]) || []
      if (features.length === 0) {
        try {
          const plansRes = await client.listPlans({
            applicationId: effectiveApplicationId,
            appName: effectiveAppName,
            active: true,
          })
          const plans = plansRes.data || []
          const plan = plans.find(p => p.name === activeSub.metadata?.planName)
          features = plan?.features || []
        } catch {
          // Plan lookup is best-effort
        }
      }

      const subStatus = activeSub.metadata?.subscriptionStatus as string | undefined
      setStatus({
        loading: false,
        isActive: true,
        isTrialing: subStatus === 'trialing',
        isCanceling: activeSub.cancelAtPeriodEnd || false,
        plan: (activeSub.metadata?.planName as string) || null,
        features,
        periodEnd: activeSub.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null,
        subscription: activeSub,
      })
    } catch {
      setStatus(prev => ({ ...prev, loading: false }))
    }
  }, [client, params.userId, effectiveApplicationId, effectiveAppName])

  useEffect(() => {
    load()
  }, [load])

  return status
}
