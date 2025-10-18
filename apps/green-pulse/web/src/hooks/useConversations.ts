'use client'

import { useState, useCallback, useEffect } from 'react'
import { callApi } from '@/utils/api'

export type ConversationListItem = {
  id: string
  title: string
  preview?: string
  createdAt: Date
  updatedAt: Date
  unread?: boolean
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all conversations
  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await callApi<{ conversations: any[] }>('/conversations')

      if (response.ok && response.data?.conversations) {
        setConversations(
          response.data.conversations.map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          }))
        )
      } else {
        throw new Error('Failed to load conversations')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations'
      setError(errorMessage)
      console.error('Load conversations error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Create new conversation
  const createConversation = useCallback(async (title: string = 'New Chat') => {
    try {
      const response = await callApi<any>('/conversations', {
        method: 'POST',
        body: { title },
      })

      if (response.ok && response.data) {
        const newConv = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        }
        setConversations(prev => [newConv, ...prev])
        return newConv
      }
      throw new Error('Failed to create conversation')
    } catch (err) {
      console.error('Create conversation error:', err)
      throw err
    }
  }, [])

  // Rename conversation
  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      const response = await callApi(`/conversations/${id}`, {
        method: 'PATCH',
        body: { title: newTitle },
      })

      if (response.ok) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === id ? { ...conv, title: newTitle, updatedAt: new Date() } : conv
          )
        )
      } else {
        throw new Error('Failed to rename conversation')
      }
    } catch (err) {
      console.error('Rename conversation error:', err)
      throw err
    }
  }, [])

  // Soft delete conversation
  const softDeleteConversation = useCallback(async (id: string) => {
    try {
      const response = await callApi(`/conversations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== id))
      } else {
        throw new Error('Failed to delete conversation')
      }
    } catch (err) {
      console.error('Soft delete conversation error:', err)
      throw err
    }
  }, [])

  // Hard delete conversation (permanent)
  const hardDeleteConversation = useCallback(async (id: string) => {
    try {
      const response = await callApi(`/conversations/${id}/hard`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== id))
      } else {
        throw new Error('Failed to permanently delete conversation')
      }
    } catch (err) {
      console.error('Hard delete conversation error:', err)
      throw err
    }
  }, [])

  // Restore soft deleted conversation
  const restoreConversation = useCallback(async (id: string) => {
    try {
      const response = await callApi(`/conversations/${id}/restore`, {
        method: 'POST',
      })

      if (response.ok) {
        await loadConversations()
      } else {
        throw new Error('Failed to restore conversation')
      }
    } catch (err) {
      console.error('Restore conversation error:', err)
      throw err
    }
  }, [loadConversations])

  // Load specific conversation with messages
  const loadConversation = useCallback(async (id: string) => {
    try {
      const response = await callApi<any>(`/conversations/${id}`)

      if (response.ok && response.data) {
        return {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          messages: response.data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }
      }
      return null
    } catch (err) {
      console.error('Load conversation error:', err)
      throw err
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return {
    conversations,
    loading,
    error,
    loadConversations,
    loadConversation,
    createConversation,
    renameConversation,
    softDeleteConversation,
    hardDeleteConversation,
    restoreConversation,
  }
}
