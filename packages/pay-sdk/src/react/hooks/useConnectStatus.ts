'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { ConnectedAccount } from '../../core/types.js'

interface UseConnectStatusParams {
  autoLoad?: boolean
}

export function useConnectStatus(params: UseConnectStatusParams = {}) {
  const { client } = usePayContext()
  const [account, setAccount] = useState<ConnectedAccount | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { autoLoad = true } = params

  const loadStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getConnectStatus()
      setAccount(result.connectedAccount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connect status')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (autoLoad) {
      loadStatus()
    }
  }, [autoLoad, loadStatus])

  return {
    account,
    isLoading,
    error,
    refetch: loadStatus,
  }
}
