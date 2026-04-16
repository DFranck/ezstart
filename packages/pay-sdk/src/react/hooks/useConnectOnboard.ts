'use client'

import { useCallback, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { ConnectOnboardRequest, ConnectOnboardResponse } from '../../core/types.js'

export function useConnectOnboard() {
  const { client } = usePayContext()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onboard = useCallback(
    async (data: ConnectOnboardRequest): Promise<ConnectOnboardResponse> => {
      setIsPending(true)
      setError(null)
      try {
        const result = await client.connectOnboard(data)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start onboarding'
        setError(message)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [client]
  )

  return {
    onboard,
    isPending,
    error,
  }
}
