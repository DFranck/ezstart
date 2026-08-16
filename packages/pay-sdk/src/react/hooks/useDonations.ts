'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { Payment } from '../../core/types.js'

interface UseDonationsParams {
  projectId?: string
  limit?: number
  autoLoad?: boolean
}

export function useDonations(params: UseDonationsParams = {}) {
  const { client } = usePayContext()
  const [donations, setDonations] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { projectId, limit = 10, autoLoad = true } = params

  const loadDonations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getDonations({ projectId, limit })
      setDonations(result.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donations')
    } finally {
      setIsLoading(false)
    }
  }, [client, projectId, limit])

  useEffect(() => {
    if (autoLoad) {
      loadDonations()
    }
  }, [autoLoad, loadDonations])

  return {
    donations,
    isLoading,
    error,
    reload: loadDonations,
  }
}
