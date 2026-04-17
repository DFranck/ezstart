'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { Plan } from '../../core/types.js'

interface UsePlansParams {
  appName?: string
  active?: boolean
  limit?: number
  offset?: number
  autoLoad?: boolean
}

export function usePlans(params: UsePlansParams = {}) {
  const { client } = usePayContext()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { appName, active = true, limit = 50, offset = 0, autoLoad = true } = params

  const loadPlans = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.listPlans({ appName, active, limit, offset })
      const sortedPlans = (result.data || []).sort((a, b) => a.sortOrder - b.sortOrder)
      setPlans(sortedPlans)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans')
    } finally {
      setIsLoading(false)
    }
  }, [client, appName, active, limit, offset])

  useEffect(() => {
    if (autoLoad) {
      loadPlans()
    }
  }, [autoLoad, loadPlans])

  return {
    plans,
    isLoading,
    error,
    reload: loadPlans,
  }
}
