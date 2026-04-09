'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAIContext } from '../../provider.js'
import type { AppProvider, UpdateAppProviderRequest } from '../../ai-types.js'
import type { ProviderType } from '../../ai-types.js'

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
    appProviders: data?.providers || ([] as AppProvider[]),
    loading: isLoading,
    error: error?.message || null,
    toggleProvider: toggleMutation.mutateAsync,
    createProvider: createMutation.mutateAsync,
    updateProvider: (id: string, updateData: UpdateAppProviderRequest) =>
      updateMutation.mutateAsync({ id, data: updateData }),
    deleteProvider: deleteMutation.mutateAsync,
  }
}
