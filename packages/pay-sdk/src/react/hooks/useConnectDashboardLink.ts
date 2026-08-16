'use client'

import { useCallback, useState } from 'react'
import { usePayContext } from '../pay-provider.js'

export function useConnectDashboardLink() {
  const { client } = usePayContext()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openDashboard = useCallback(async (): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getConnectDashboardLink()
      return result.loginLinkUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get dashboard link'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [client])

  return {
    openDashboard,
    isLoading,
    error,
  }
}
