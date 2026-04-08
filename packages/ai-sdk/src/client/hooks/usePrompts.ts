'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAIContext } from '../../provider.js'
import type {
  PromptType,
  ProviderTarget,
  UpdatePromptRequest,
  CreatePromptRequest,
} from '../../ai-types.js'

export function usePrompts(params?: { type?: PromptType; provider?: ProviderTarget }) {
  const { client, appName } = useAIContext()
  const queryClient = useQueryClient()

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['ai-prompts', appName, params],
    queryFn: () => client.listPrompts(params),
  })

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreatePromptRequest, 'appName'>) => client.createPrompt(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-prompts'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdatePromptRequest }) =>
      client.updatePrompt(key, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-prompts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => client.deletePrompt(key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-prompts'] }),
  })

  return {
    prompts: data?.prompts || [],
    meta: data?.meta,
    loading,
    error: error?.message || null,
    createPrompt: createMutation.mutateAsync,
    updatePrompt: (key: string, updateData: UpdatePromptRequest) =>
      updateMutation.mutateAsync({ key, data: updateData }),
    deletePrompt: deleteMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['ai-prompts'] }),
  }
}
