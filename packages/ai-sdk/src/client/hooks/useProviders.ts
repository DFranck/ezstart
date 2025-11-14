/**
 * useProviders Hook
 * Fetch and manage available AI providers
 */
'use client'

import { useEffect, useState } from 'react'
import { useAIStore } from '../store/aiStore.js'
import { callApi } from '@ezstart/fetch-client'

export function useProviders(appName: string = 'green-pulse') {
  const { providers, setProviders } = useAIStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchProviders() {
      setLoading(true)
      try {
        const response = await callApi('/providers', { appName })
        setProviders(response.data || [])
      } catch (err) {
        setError(err as Error)
        console.error('Failed to fetch providers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [appName, setProviders])

  return { providers, loading, error }
}
