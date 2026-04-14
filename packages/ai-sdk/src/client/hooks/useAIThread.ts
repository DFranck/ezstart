'use client'

import { logger } from '@ezstart/logger'
import { getApiUrl } from '@ezstart/config'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useThreadAPI } from '@ezstart/ui/hooks'
import type { UseThreadAPIReturn } from '@ezstart/ui/hooks'
import { useAIContext } from '../../provider.js'
import { useChatProviders } from './useAppProviders.js'
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
  /** Enable SSE streaming (uses /api/ai/chat/stream). Default: true */
  streaming?: boolean
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
  providersLoading: boolean
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
  const { appName, locale, extraPayload, onError, onConversationCreated, streaming = true } = config

  // AIProvider context (gives us the AIClient)
  const { client } = useAIContext()
  const queryClient = useQueryClient()

  // State
  // Persist active conversation across reloads (scoped by app to avoid cross-app leaks)
  const storageKey = `ai-sdk:activeConversationId:${appName}`
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(storageKey)
    } catch {
      return null
    }
  })
  const setActiveConversationId = useCallback(
    (id: string | null) => {
      setActiveConversationIdState(id)
      if (typeof window === 'undefined') return
      try {
        if (id) window.localStorage.setItem(storageKey, id)
        else window.localStorage.removeItem(storageKey)
      } catch {
        /* ignore storage failures */
      }
    },
    [storageKey]
  )
  // Track whether user explicitly chose a provider (vs auto-selected)
  const [userChoseProvider, setUserChoseProvider] = useState(false)

  // Auth (read token each render to stay reactive)
  const token = getAuthToken()
  const isAuthenticated = !!token

  // Providers (app-scoped: join of DB app-provider config + global registry metadata)
  const {
    providers,
    loading: providersLoading,
    selectedProvider,
    setSelectedProvider: rawSetSelectedProvider,
  } = useChatProviders()

  // Wrap setSelectedProvider to track explicit user choice
  const setSelectedProvider = useCallback(
    (id: string) => {
      setUserChoseProvider(true)
      rawSetSelectedProvider(id)
    },
    [rawSetSelectedProvider]
  )

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

  // Track conversationId received from the SSE meta event (for streaming mode)
  const [streamConversationId, setStreamConversationId] = useState<string | null>(null)

  // Process conversationId from stream meta events or non-stream responses
  useEffect(() => {
    if (!streamConversationId) return
    if (streamConversationId === activeConversationId) return

    logger.info(`[useAIThread] Conversation created: ${streamConversationId}`)
    setActiveConversationId(streamConversationId)
    loadConversations()
    onConversationCreated?.(streamConversationId)
    refreshConversation(streamConversationId)
    setStreamConversationId(null)
  }, [
    streamConversationId,
    activeConversationId,
    loadConversations,
    refreshConversation,
    onConversationCreated,
  ])

  const chatEndpoint = streaming
    ? `${getApiUrl('ezstart')}/api/ai/chat/stream`
    : `${getApiUrl('ezstart')}/api/ai/chat`

  const threadConfig = useMemo(
    () => ({
      endpoint: chatEndpoint,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      enableStreaming: streaming,

      formatRequest: (message: string) => {
        const payload: Record<string, unknown> = {
          message,
          appName,
          locale,
          ...extraPayload,
        }
        // Only send providerId if user explicitly chose one — otherwise let backend cascade
        if (selectedProvider && userChoseProvider) {
          payload.providerId = selectedProvider
        }
        if (activeConversationId) {
          payload.conversationId = activeConversationId
        }
        return payload
      },

      formatResponse: (rawData: unknown): string => {
        const data = rawData as Record<string, unknown>

        // SSE streaming format: { type: "chunk", content: "..." }
        if (data.type === 'chunk') {
          return String(data.content || '')
        }

        // SSE meta event: { type: "meta", provider: "...", conversationId: "..." }
        // Capture conversationId from meta event (no text to return)
        if (data.type === 'meta') {
          const convId = data.conversationId as string | undefined
          if (convId) {
            setStreamConversationId(convId)
          }
          return ''
        }

        // SSE error event: { type: "error", error: "..." }
        if (data.type === 'error') {
          logger.error('[useAIThread] Stream error event:', data.error)
          return ''
        }

        // Non-streaming JSON response: { data: { response, conversationId } }
        const nested = data.data as Record<string, unknown> | undefined
        return String(data.delta || nested?.response || data.response || '')
      },

      onSuccess: (rawData: unknown) => {
        const data = rawData as Record<string, unknown>

        // For streaming: conversationId is captured via meta event in formatResponse
        // For non-streaming: extract from standard response format
        const nested = data.data as Record<string, unknown> | undefined
        const conversationId = (data.conversationId || nested?.conversationId) as string | undefined

        if (conversationId && !activeConversationId) {
          setStreamConversationId(conversationId)
        }

        // Refresh conversation cache so messages stay in sync
        if (conversationId || activeConversationId) {
          refreshConversation((conversationId || activeConversationId)!)
        }
      },

      onError: (error: Error) => {
        logger.error('[useAIThread] Chat error:', error.message)
        onError?.(error)
      },
    }),
    [
      chatEndpoint,
      streaming,
      token,
      appName,
      locale,
      extraPayload,
      selectedProvider,
      userChoseProvider,
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
  // Guards cover three races that caused visible flashes ("Welcome to X" after
  // a send, then again after the stream ends):
  //   1. Send in flight       → don't touch the thread, the UI is streaming.
  //   2. Persistence lag      → API returned 0 messages but we already have
  //                             optimistic local ones → skip.
  //   3. No-op rehydrate      → server payload is the same tail as local
  //                             state → skip (avoids setMessages-loops when
  //                             React Query refetches the same conv).
  useEffect(() => {
    if (!conversationData?.messages) return
    if (thread.loading) return

    const threadMessages: ThreadMessage[] = conversationData.messages.map(
      (msg: { role: string; content: string; timestamp?: Date | string }) => ({
        id: `${msg.role}-${msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()}`,
        role: (msg.role === 'assistant' ? 'ai' : 'user') as 'user' | 'ai',
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
      })
    )

    const serverLen = threadMessages.length
    const localLen = thread.messages.length

    if (serverLen === 0 && localLen > 0) return
    if (serverLen === localLen && serverLen > 0) {
      const lastLocal = thread.messages[localLen - 1]
      const lastServer = threadMessages[serverLen - 1]
      if (lastLocal?.content === lastServer?.content && lastLocal?.role === lastServer?.role) {
        return
      }
    }

    thread.loadMessages(threadMessages)
  }, [conversationData, thread.loadMessages, thread.loading, thread.messages])

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

  const handleConversationSelect = useCallback(
    (id: string) => {
      // Clear the thread immediately: otherwise selecting an empty conversation
      // keeps the previous conv's messages visible until the (empty) API
      // response arrives. The hydration effect will re-fill if the target conv
      // actually has messages.
      thread.clearMessages()
      setActiveConversationId(id)
    },
    [thread.clearMessages, setActiveConversationId]
  )

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
    providersLoading,
    selectedProvider,
    setSelectedProvider,

    // Auth
    isAuthenticated,
  }
}
