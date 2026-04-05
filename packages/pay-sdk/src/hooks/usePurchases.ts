'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../provider.js'
import type { Payment } from '../types.js'

interface UsePurchasesParams {
  userId?: string
  limit?: number
  offset?: number
  autoLoad?: boolean
}

export function usePurchases(params: UsePurchasesParams = {}) {
  const { client } = usePayContext()
  const [purchases, setPurchases] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { userId, limit = 10, offset = 0, autoLoad = true } = params

  const loadPurchases = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getPurchases({ userId, limit, offset })
      setPurchases(result.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchases')
    } finally {
      setIsLoading(false)
    }
  }, [client, userId, limit, offset])

  useEffect(() => {
    if (autoLoad) {
      loadPurchases()
    }
  }, [autoLoad, loadPurchases])

  return {
    purchases,
    isLoading,
    error,
    reload: loadPurchases,
  }
}
