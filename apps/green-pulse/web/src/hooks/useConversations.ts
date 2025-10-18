'use client'

import { useState, useCallback, useEffect } from 'react'

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
      const res = await fetch('/api/conversations')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success && data.data?.conversations) {
        setConversations(
          data.data.conversations.map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          }))
        )
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
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success && data.data) {
        const newConv = {
          ...data.data,
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        }
        setConversations(prev => [newConv, ...prev])
        return newConv
      }
    } catch (err) {
      console.error('Create conversation error:', err)
      throw err
    }
  }, [])

  // Rename conversation
  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === id ? { ...conv, title: newTitle, updatedAt: new Date() } : conv
          )
        )
      }
    } catch (err) {
      console.error('Rename conversation error:', err)
      throw err
    }
  }, [])

  // Soft delete conversation
  const softDeleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success) {
        // Remove from list (soft delete hides it)
        setConversations(prev => prev.filter(conv => conv.id !== id))
      }
    } catch (err) {
      console.error('Soft delete conversation error:', err)
      throw err
    }
  }, [])

  // Hard delete conversation (permanent)
  const hardDeleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/hard`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success) {
        setConversations(prev => prev.filter(conv => conv.id !== id))
      }
    } catch (err) {
      console.error('Hard delete conversation error:', err)
      throw err
    }
  }, [])

  // Restore soft deleted conversation
  const restoreConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/restore`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.success) {
        // Reload conversations to show restored one
        await loadConversations()
      }
    } catch (err) {
      console.error('Restore conversation error:', err)
      throw err
    }
  }, [loadConversations])

  // Load on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    renameConversation,
    softDeleteConversation,
    hardDeleteConversation,
    restoreConversation,
  }
}
