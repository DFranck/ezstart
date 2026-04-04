'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../provider.js'
import type { Payment } from '../types.js'

interface UseSubscriptionsParams {
  userId?: string
  limit?: number
  offset?: number
  autoLoad?: boolean
}

export function useSubscriptions(params: UseSubscriptionsParams = {}) {
  const { client } = usePayContext()
  const [subscriptions, setSubscriptions] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { userId, limit = 10, offset = 0, autoLoad = true } = params

  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getSubscriptions({ userId, limit, offset })
      setSubscriptions(result.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setIsLoading(false)
    }
  }, [client, userId, limit, offset])

  useEffect(() => {
    if (autoLoad) {
      loadSubscriptions()
    }
  }, [autoLoad, loadSubscriptions])

  return {
    subscriptions,
    isLoading,
    error,
    reload: loadSubscriptions,
  }
}
