'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAIContext } from '../../provider.js'
import type { ConversationListItem } from '../../ai-types.js'

export function useConversations() {
  const { client, appName } = useAIContext()
  const queryClient = useQueryClient()

  // Query: list conversations
  const {
    data: conversations = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['ai-conversations', appName],
    queryFn: async () => {
      const result = await client.listConversations()
      return result.conversations.map((conv: ConversationListItem) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
      }))
    },
  })

  // Mutations: create, rename, softDelete, hardDelete, restore
  const createMutation = useMutation({
    mutationFn: (title: string) => client.createConversation({ title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, newTitle }: { id: string; newTitle: string }) =>
      client.updateConversation(id, { title: newTitle }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.deleteConversation(id),
    onSuccess: (_: void, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
      queryClient.removeQueries({ queryKey: ['ai-conversation', id] })
    },
  })

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => client.hardDeleteConversation(id),
    onSuccess: (_: void, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
      queryClient.removeQueries({ queryKey: ['ai-conversation', id] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => client.restoreConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  })

  const loadConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
  }, [queryClient])

  const refreshConversation = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', id] })
    },
    [queryClient]
  )

  const renameConversation = useCallback(
    (id: string, newTitle: string) => renameMutation.mutateAsync({ id, newTitle }),
    [renameMutation]
  )

  return {
    conversations,
    loading,
    error: error?.message || null,
    createConversation: createMutation.mutateAsync,
    renameConversation,
    softDeleteConversation: deleteMutation.mutateAsync,
    hardDeleteConversation: hardDeleteMutation.mutateAsync,
    restoreConversation: restoreMutation.mutateAsync,
    loadConversations,
    refreshConversation,
  }
}

/**
 * Hook to fetch a single conversation with messages.
 * Separate hook because React hooks cannot be called conditionally.
 */
export function useConversation(id: string | null) {
  const { client } = useAIContext()

  return useQuery({
    queryKey: ['ai-conversation', id],
    queryFn: async () => {
      if (!id) return null
      return client.getConversation(id)
    },
    enabled: !!id,
  })
}
