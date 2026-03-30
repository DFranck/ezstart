/**
 * useProviders Hook
 * Fetch and manage available AI providers
 */
'use client'

import { logger } from '@ezstart/logger'
import { useEffect, useState } from 'react'
import { useAIStore, type AIProviderInfo } from '../store/aiStore.js'
import { callApi } from '@ezstart/fetch-client'
import type { AppName } from '@ezstart/config/urls'

export function useProviders(appName: AppName = 'green-pulse') {
  const { providers, setProviders, selectedProvider, setSelectedProvider } = useAIStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Skip fetch if we already have providers (prevents unnecessary requests)
    if (providers.length > 0) {
      return
    }

    async function fetchProviders() {
      setLoading(true)
      setError(null)
      try {
        const response = await callApi<AIProviderInfo[]>('/providers', {
          appName,
          logLevel: 'errors',
        })

        if (response.ok && response.data) {
          setProviders(response.data || [])
        } else {
          throw new Error('Failed to fetch providers')
        }
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
  }, [appName, providers.length, setProviders])

  return { providers, loading, error, selectedProvider, setSelectedProvider }
}
