'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../provider.js'
import type { Payment } from '../types.js'

interface SubscriptionStatus {
  loading: boolean
  /** Has an active subscription */
  isActive: boolean
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
  appName: string
}

export function useSubscriptionStatus(params: UseSubscriptionStatusParams): SubscriptionStatus {
  const { client } = usePayContext()
  const [status, setStatus] = useState<SubscriptionStatus>({
    loading: true,
    isActive: false,
    isCanceling: false,
    plan: null,
    features: [],
    periodEnd: null,
    subscription: null,
  })

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

      // Fetch plans to resolve features
      let features: string[] = []
      try {
        const plansRes = await client.listPlans({ appName: params.appName, active: true })
        const plans = plansRes.data || []
        const plan = plans.find(p => p.name === activeSub.metadata?.planName)
        features = plan?.features || []
      } catch {
        // Plan lookup is best-effort
      }

      setStatus({
        loading: false,
        isActive: true,
        isCanceling: activeSub.cancelAtPeriodEnd || false,
        plan: activeSub.metadata?.planName || null,
        features,
        periodEnd: activeSub.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null,
        subscription: activeSub,
      })
    } catch {
      setStatus(prev => ({ ...prev, loading: false }))
    }
  }, [client, params.userId, params.appName])

  useEffect(() => {
    load()
  }, [load])

  return status
}
