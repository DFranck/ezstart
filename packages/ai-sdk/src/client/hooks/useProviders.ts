/**
 * useProviders Hook
 * Fetch and manage available AI providers
 */
'use client'

import { logger } from '@ezstart/logger'
import { useEffect, useState } from 'react'
import { useAIContext } from '../../provider.js'
import { useAIStore, type AIProviderInfo } from '../store/aiStore.js'

export function useProviders() {
  const { client } = useAIContext()
  const { providers, setProviders, selectedProvider, setSelectedProvider } = useAIStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Always refetch on mount — the persisted `ai-store` is shared with
    // `useChatProviders` (app-scoped, filtered), so a stale cache could show
    // a truncated catalog in AIAdminDashboard after navigating admin→chat→admin.
    async function fetchProviders() {
      setLoading(true)
      setError(null)
      try {
        const data: AIProviderInfo[] = await client.listProviders()
        setProviders(data)
      } catch (err) {
        const error = err as Error
        setError(error)

        // Only log error once (not on every render)
        logger.error('Failed to fetch AI providers:', error.message)

        // Provide helpful message for rate limiting
        if (error.message?.includes('Too many requests') || error.message?.includes('RATE_LIMIT')) {
          logger.warn('Rate limit reached. Providers will retry on next page load.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [client, setProviders])

  return { providers, loading, error, selectedProvider, setSelectedProvider }
}
