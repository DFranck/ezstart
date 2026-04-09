'use client'

import { logger } from '@ezstart/logger'
import { getApiUrl } from '@ezstart/config'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useThreadAPI } from '@ezstart/ui/hooks'
import type { UseThreadAPIReturn } from '@ezstart/ui/hooks'
import { useAIContext } from '../../provider.js'
import { useProviders } from './useProviders.js'
import { useConversations, useConversation } from './useConversations.js'
import type { AIProviderInfo } from '../../server/registry/types.js'
import type { AppName } from '@ezstart/config/urls'

/**
 * ThreadMessage type extracted from UseThreadAPIReturn to avoid
 * name collision with the ThreadMessage React component in @ezstart/ui.
 */
type ThreadMessage = UseThreadAPIReturn['messages'][number]

// ─── Config ──────────────────────────────────────────────────────────────────

export type UseAIThreadConfig = {
  appName: AppName
  locale?: string
  extraPayload?: Record<string, unknown>
  onError?: (error: Error) => void
  onConversationCreated?: (id: string) => void
}

// ─── Return type ─────────────────────────────────────────────────────────────

export type UseAIThreadReturn = {
  // Thread state (from useThreadAPI)
  messages: ThreadMessage[]
  loading: boolean
  streamingText: string
  sendMessage: (message: string, files?: File[]) => Promise<void>
  resendLastMessage: () => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>
  isNewThread: boolean
  clearMessages: () => void
  loadMessages: (messages: ThreadMessage[]) => void
  error: string | null

  // Conversations
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  conversations: Array<{
    id: string
    title: string
    preview?: string
    timestamp?: Date
    unread?: boolean
  }>
  conversationsLoading: boolean
  handleNewConversation: () => void
  handleConversationSelect: (id: string) => void
  handleRename: (id: string, title: string) => Promise<void>
  handleDelete: (id: string) => Promise<void>

  // Providers
  providers: AIProviderInfo[]
  selectedProvider: string | null
  setSelectedProvider: (id: string) => void

  // Auth
  isAuthenticated: boolean
}

// ─── Auth token helper (same pattern as ai-client.ts) ────────────────────────

function getAuthToken(customGetToken?: () => string | null): string | null {
  if (customGetToken) return customGetToken()
  if (typeof window === 'undefined') return null
  try {
    const store = localStorage.getItem('ezauth-storage')
    const parsed = store ? JSON.parse(store) : null
    return parsed?.state?.accessToken || null
  } catch {
    return null
  }
}

function getIsAuthenticated(customGetToken?: () => string | null): boolean {
  return !!getAuthToken(customGetToken)
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAIThread(config: UseAIThreadConfig): UseAIThreadReturn {
  const { appName, locale, extraPayload, onError, onConversationCreated } = config

  // AIProvider context (gives us the AIClient)
  const { client } = useAIContext()
  const queryClient = useQueryClient()

  // State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  // Auth (read token each render to stay reactive)
  const token = getAuthToken()
  const isAuthenticated = !!token

  // Providers
  const { providers, selectedProvider, setSelectedProvider } = useProviders(appName)

  // Conversations
  const {
    conversations: apiConversations,
    loading: conversationsLoading,
    createConversation,
    renameConversation,
    softDeleteConversation,
    loadConversations,
    refreshConversation,
  } = useConversations()

  // Single conversation (cached via React Query)
  const { data: conversationData } = useConversation(activeConversationId)

  // ─── Build ThreadAPI config ──────────────────────────────────────────────

  const threadConfig = useMemo(
    () => ({
      endpoint: `${getApiUrl('ezstart')}/api/ai/chat`,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      enableStreaming: true,

      formatRequest: (message: string) => {
        const payload: Record<string, unknown> = {
          message,
          appName,
          stream: true,
          locale,
          ...extraPayload,
        }
        if (selectedProvider) {
          payload.providerId = selectedProvider
        }
        if (activeConversationId) {
          payload.conversationId = activeConversationId
        }
        return payload
      },

      formatResponse: (rawData: unknown): string => {
        const data = rawData as Record<string, unknown> & {
          delta?: string
          data?: Record<string, unknown>
          response?: string
        }
        return String(data.delta || data.data?.response || data.response || '')
      },

      onSuccess: (rawData: unknown) => {
        const data = rawData as Record<string, unknown> & {
          data?: Record<string, unknown>
        }
        const conversationId = data.data?.conversationId as string | undefined

        // First message creates the conversation — capture its ID
        if (conversationId && !activeConversationId) {
          logger.info(`[useAIThread] Conversation created: ${conversationId}`)
          setActiveConversationId(conversationId)

          // Reload conversation list
          loadConversations()

          // Notify parent
          onConversationCreated?.(conversationId)
        }

        // Refresh conversation cache so messages stay in sync
        if (conversationId) {
          refreshConversation(conversationId)
        }
      },

      onError: (error: Error) => {
        logger.error('[useAIThread] Chat error:', error.message)
        onError?.(error)
      },
    }),
    [
      token,
      appName,
      locale,
      extraPayload,
      selectedProvider,
      activeConversationId,
      loadConversations,
      refreshConversation,
      onError,
      onConversationCreated,
    ]
  )

  // ─── Thread API (messages, streaming, send, etc.) ────────────────────────

  const thread: UseThreadAPIReturn = useThreadAPI(threadConfig)

  // ─── Load messages when switching conversations ──────────────────────────

  useEffect(() => {
    if (!conversationData?.messages) return

    const threadMessages: ThreadMessage[] = conversationData.messages.map(
      (msg: { role: string; content: string; timestamp?: Date | string }) => ({
        id: `${msg.role}-${msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()}`,
        role: (msg.role === 'assistant' ? 'ai' : 'user') as 'user' | 'ai',
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
      })
    )

    thread.loadMessages(threadMessages)
  }, [conversationData, thread.loadMessages])

  // ─── Conversation handlers ───────────────────────────────────────────────

  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation('New Chat')
      if (newConv) {
        setActiveConversationId(newConv.id)
        thread.clearMessages()
      }
    } catch (error) {
      logger.error('[useAIThread] Failed to create conversation:', error)
    }
  }, [createConversation, thread.clearMessages])

  const handleConversationSelect = useCallback((id: string) => {
    setActiveConversationId(id)
    // React Query handles cache — useConversation(id) will fetch or serve from cache
  }, [])

  const handleRename = useCallback(
    async (id: string, title: string) => {
      try {
        await renameConversation(id, title)
      } catch (error) {
        logger.error('[useAIThread] Failed to rename conversation:', error)
      }
    },
    [renameConversation]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await softDeleteConversation(id)
        if (id === activeConversationId) {
          setActiveConversationId(null)
          thread.clearMessages()
        }
      } catch (error) {
        logger.error('[useAIThread] Failed to delete conversation:', error)
      }
    },
    [softDeleteConversation, activeConversationId, thread.clearMessages]
  )

  // ─── Map conversations to sidebar format ─────────────────────────────────

  const conversations = useMemo(
    () =>
      apiConversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        preview: conv.preview,
        timestamp: conv.updatedAt,
        unread: conv.unread || false,
      })),
    [apiConversations]
  )

  // ─── Return ──────────────────────────────────────────────────────────────

  return {
    // Thread
    messages: thread.messages,
    loading: thread.loading,
    streamingText: thread.streamingText,
    sendMessage: thread.sendMessage,
    resendLastMessage: thread.resendLastMessage,
    editMessage: thread.editMessage,
    isNewThread: thread.isNewThread,
    clearMessages: thread.clearMessages,
    loadMessages: thread.loadMessages,
    error: thread.error,

    // Conversations
    activeConversationId,
    setActiveConversationId,
    conversations,
    conversationsLoading,
    handleNewConversation,
    handleConversationSelect,
    handleRename,
    handleDelete,

    // Providers
    providers,
    selectedProvider,
    setSelectedProvider,

    // Auth
    isAuthenticated,
  }
}
