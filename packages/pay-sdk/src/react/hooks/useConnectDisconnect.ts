'use client'

import { useCallback, useState } from 'react'
import { usePayContext } from '../pay-provider.js'

export function useConnectDisconnect() {
  const { client } = usePayContext()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(async (): Promise<boolean> => {
    setIsPending(true)
    setError(null)
    try {
      await client.disconnectAccount()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect account'
      setError(message)
      return false
    } finally {
      setIsPending(false)
    }
  }, [client])

  return {
    disconnect,
    isPending,
    error,
  }
}
