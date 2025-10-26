'use client'

import { callApi } from '@/utils/api'
import { useAuthStore } from '@ezstart/auth-sdk'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type ConversationListItem = {
  id: string
  title: string
  preview?: string
  createdAt: Date
  updatedAt: Date
  unread?: boolean
}

export type ConversationWithMessages = ConversationListItem & {
  messages: Array<{
    role: string
    content: string
    timestamp: Date
  }>
}

/**
 * React Query hook for conversations management
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - No refetch on conversation switch (uses cache)
 * - Optimistic updates for mutations
 * - Automatic background revalidation
 */
export function useConversations() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Query: Load all conversations
  const {
    data: conversations = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['conversations', user?._id],
    queryFn: async () => {
      // Filter by userId to only show current user's conversations
      const userId = user?._id
      const endpoint = userId ? `/conversations?userId=${userId}` : '/conversations'

      const response = await callApi<{ success: boolean; data: { conversations: any[] } }>(
        endpoint
      )

      if (response.ok && response.data?.data?.conversations) {
        return response.data.data.conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
        }))
      }
      throw new Error('Failed to load conversations')
    },
  })

  // Query: Load specific conversation with messages (cached!)
  const useConversation = (id: string | null) => {
    return useQuery({
      queryKey: ['conversation', id],
      queryFn: async () => {
        if (!id) return null

        const response = await callApi<{ success: boolean; data: any }>(`/conversations/${id}`)

        if (response.ok && response.data?.data) {
          const conversation = response.data.data
          return {
            ...conversation,
            createdAt: new Date(conversation.createdAt),
            updatedAt: new Date(conversation.updatedAt),
            messages:
              conversation.messages?.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })) || [],
          } as ConversationWithMessages
        }
        return null
      },
      enabled: !!id, // Only run query if id exists
    })
  }

  // Mutation: Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string = 'New Chat') => {
      const response = await callApi<{ success: boolean; data: any }>('/conversations', {
        method: 'POST',
        body: { title },
      })

      if (response.ok && response.data?.data) {
        const conversation = response.data.data
        return {
          ...conversation,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
        }
      }
      throw new Error('Failed to create conversation')
    },
    onSuccess: newConv => {
      // Optimistic update: Add to cache immediately
      queryClient.setQueryData(['conversations'], (old: ConversationListItem[] = []) => [
        newConv,
        ...old,
      ])
    },
  })

  // Mutation: Rename conversation
  const renameConversationMutation = useMutation({
    mutationFn: async ({ id, newTitle }: { id: string; newTitle: string }) => {
      const response = await callApi(`/conversations/${id}`, {
        method: 'PATCH',
        body: { title: newTitle },
      })

      if (!response.ok) {
        throw new Error('Failed to rename conversation')
      }
      return { id, newTitle }
    },
    onSuccess: ({ id, newTitle }) => {
      // Optimistic update
      queryClient.setQueryData(['conversations'], (old: ConversationListItem[] = []) =>
        old.map(conv => (conv.id === id ? { ...conv, title: newTitle, updatedAt: new Date() } : conv))
      )
    },
  })

  // Mutation: Soft delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await callApi(`/conversations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }
      return id
    },
    onSuccess: id => {
      // Optimistic update
      queryClient.setQueryData(['conversations'], (old: ConversationListItem[] = []) =>
        old.filter(conv => conv.id !== id)
      )
      // Invalidate specific conversation cache
      queryClient.removeQueries({ queryKey: ['conversation', id] })
    },
  })

  // Mutation: Hard delete conversation
  const hardDeleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await callApi(`/conversations/${id}/hard`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to permanently delete conversation')
      }
      return id
    },
    onSuccess: id => {
      queryClient.setQueryData(['conversations'], (old: ConversationListItem[] = []) =>
        old.filter(conv => conv.id !== id)
      )
      queryClient.removeQueries({ queryKey: ['conversation', id] })
    },
  })

  // Mutation: Restore conversation
  const restoreConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await callApi(`/conversations/${id}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to restore conversation')
      }
      return id
    },
    onSuccess: () => {
      // Refetch all conversations after restore
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  return {
    // Data
    conversations,
    loading,
    error: error?.message || null,

    // Query hook for single conversation
    useConversation,

    // Mutations (unwrap for cleaner API)
    createConversation: createConversationMutation.mutateAsync,
    renameConversation: (id: string, newTitle: string) =>
      renameConversationMutation.mutateAsync({ id, newTitle }),
    softDeleteConversation: deleteConversationMutation.mutateAsync,
    hardDeleteConversation: hardDeleteConversationMutation.mutateAsync,
    restoreConversation: restoreConversationMutation.mutateAsync,

    // Manual refetch (rarely needed with React Query)
    loadConversations: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  }
}
