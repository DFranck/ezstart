'use client'

import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAIContext } from '../../provider.js'
import { useAIStore, type AIProviderInfo } from '../store/aiStore.js'
import type { EnrichedAppProvider, UpdateAppProviderRequest } from '../../ai-types.js'
import type { ProviderType } from '../../ai-types.js'

// Stable reference for the empty fallback so downstream useMemo/useEffect
// deps don't invalidate on every render while `data` is undefined.
const EMPTY_APP_PROVIDERS: EnrichedAppProvider[] = []

export function useAppProviders() {
  const { client, appName } = useAIContext()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-app-providers', appName],
    queryFn: () => client.listAppProviders(),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => client.toggleAppProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-app-providers'] }),
  })

  const createMutation = useMutation({
    mutationFn: (createData: {
      providerId: string
      providerType: ProviderType
      priority: number
      enabled: boolean
      config?: { model?: string; temperature?: number; maxTokens?: number }
    }) => client.createAppProvider(createData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-app-providers'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data: updateData }: { id: string; data: UpdateAppProviderRequest }) =>
      client.updateAppProvider(id, updateData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-app-providers'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.deleteAppProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-app-providers'] }),
  })

  return {
    appProviders: data?.providers ?? EMPTY_APP_PROVIDERS,
    loading: isLoading,
    error: error?.message || null,
    toggleProvider: toggleMutation.mutateAsync,
    createProvider: createMutation.mutateAsync,
    updateProvider: (id: string, updateData: UpdateAppProviderRequest) =>
      updateMutation.mutateAsync({ id, data: updateData }),
    deleteProvider: deleteMutation.mutateAsync,
  }
}

/**
 * useChatProviders
 *
 * App-scoped provider selector for the chat UI.
 * Fetches app-provider authorizations (join of DB config + global registry metadata),
 * keeps only providers that are enabled AND still registered in the global registry,
 * and projects them into the AIProviderInfo shape consumed by useAIThread / AISelector.
 *
 * Sort order: priority ASC (lower priority number = preferred first).
 */
export function useChatProviders() {
  const { appProviders, loading, error } = useAppProviders()
  const { selectedProvider, setSelectedProvider, setProviders } = useAIStore()

  const providers = useMemo<AIProviderInfo[]>(() => {
    return appProviders
      .filter(p => p.enabled && p.registered)
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .map(p => ({
        id: p.providerId,
        name: p.name,
        type: p.providerType,
        enabled: true,
        capabilities: p.capabilities,
        model: p.model,
      }))
  }, [appProviders])

  // Sync projected providers into the Zustand store so:
  //  - selectedProvider auto-selects first available on initial load
  //  - stale selections are invalidated when the app-provider list changes
  useEffect(() => {
    if (!loading) {
      setProviders(providers)
    }
  }, [loading, providers, setProviders])

  return {
    providers,
    loading,
    error,
    selectedProvider,
    setSelectedProvider,
  }
}
