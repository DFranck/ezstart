'use client'

import { useCallback, useState } from 'react'
import { usePayContext } from '../pay-provider.js'

interface DisconnectParams {
  /**
   * Scope the disconnect to a single Application — required when the user
   * owns multiple ConnectedAccounts (the API returns 400 otherwise). Omit
   * for the degenerate single-account case (legacy callers).
   */
  applicationId?: string
}

export function useConnectDisconnect() {
  const { client } = usePayContext()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(
    async (params?: DisconnectParams): Promise<boolean> => {
      setIsPending(true)
      setError(null)
      try {
        await client.disconnectAccount(params)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to disconnect account'
        setError(message)
        return false
      } finally {
        setIsPending(false)
      }
    },
    [client]
  )

  return {
    disconnect,
    isPending,
    error,
  }
}
