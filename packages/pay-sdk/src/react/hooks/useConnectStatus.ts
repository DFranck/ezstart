'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { ConnectedAccount } from '../../core/types.js'

interface UseConnectStatusParams {
  autoLoad?: boolean
  /**
   * Scope the lookup to a single Application. When provided, the hook returns
   * the ConnectedAccount owned by the current user for this Application (if
   * any). When omitted, the backend aggregates across all the user's accounts
   * — use the scoped form on per-Application pages.
   */
  applicationId?: string
}

export function useConnectStatus(params: UseConnectStatusParams = {}) {
  const { client } = usePayContext()
  const [account, setAccount] = useState<ConnectedAccount | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { autoLoad = true, applicationId } = params

  const loadStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getConnectStatus(applicationId ? { applicationId } : undefined)
      setAccount(result.connectedAccount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connect status')
    } finally {
      setIsLoading(false)
    }
  }, [client, applicationId])

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
