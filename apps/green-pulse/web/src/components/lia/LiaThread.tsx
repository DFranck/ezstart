'use client'

import { greenPulseThreadTheme } from '@/config/thread-theme'
import { useConversations } from '@/hooks/useConversations'
import type { AIProviderInfo } from '@ezstart/ai-sdk'
import { AISelector } from '@ezstart/ai-sdk/client'
import { useAuthStore } from '@ezstart/auth-sdk'
import {
  Conversation,
  Thread,
  ThreadComposer,
  ThreadLayout,
  ThreadMessages,
  ThreadSidebar,
  ThreadSidebarToggle,
  ThreadWelcome,
} from '@ezstart/ui/components'
import { useCallback, useEffect } from 'react'
import { useThreadContext } from './ThreadProvider'

type LiaThreadProps = {
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  onRegisterConversationCreatedCallback?: (callback: () => void) => void
  providers?: AIProviderInfo[]
  selectedProvider?: string | null
  onProviderChange?: (providerId: string) => void
}

export function LiaThread({
  activeConversationId,
  setActiveConversationId,
  onRegisterConversationCreatedCallback,
  providers = [],
  selectedProvider,
  onProviderChange,
}: LiaThreadProps) {
  // Check if user is authenticated
  const { isAuthenticated } = useAuthStore()

  const {
    messages,
    loading,
    streamingText,
    sendMessage,
    resendLastMessage,
    editMessage,
    isNewThread,
    clearMessages,
    loadMessages,
  } = useThreadContext()

  const {
    conversations: apiConversations,
    loading: conversationsLoading,
    createConversation,
    renameConversation,
    softDeleteConversation,
    useConversation,
    loadConversations,
  } = useConversations()

  // Use React Query to fetch conversation (CACHED! ✅)
  const { data: conversationData } = useConversation(activeConversationId)

  // Debug: Log when activeConversationId changes
  useEffect(() => {
    console.log('[LiaThread] 🔴 activeConversationId changed:', activeConversationId)
  }, [activeConversationId])

  // Register callback to reload conversations when auto-created
  useEffect(() => {
    if (onRegisterConversationCreatedCallback && loadConversations) {
      onRegisterConversationCreatedCallback(() => loadConversations)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterConversationCreatedCallback]) // Only run when callback changes, not loadConversations

  // Load messages from cache when conversationData changes
  useEffect(() => {
    console.log('[LiaThread] 🟢 conversationData changed:', conversationData?.id, conversationData)
    if (conversationData && conversationData.messages) {
      const threadMessages = conversationData.messages.map((msg: any) => ({
        id: `${msg.role}-${msg.timestamp.getTime()}`,
        role: msg.role === 'assistant' ? 'ai' : msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }))
      console.log('[LiaThread] 🟢 Loading messages:', threadMessages.length)
      loadMessages(threadMessages)
    }
  }, [conversationData, loadMessages])

  // Convert to ThreadSidebar format
  const conversations: Conversation[] = apiConversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    preview: conv.preview,
    timestamp: conv.updatedAt,
    unread: conv.unread || false,
  }))

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation('New Chat')
      if (newConv) {
        setActiveConversationId(newConv.id)
        clearMessages()
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error)
    }
  }, [createConversation, clearMessages, setActiveConversationId])

  // Handle conversation select (NO MORE REFETCH! Uses cache ✅)
  const handleConversationSelect = useCallback(
    (id: string) => {
      console.log('[LiaThread] 🔵 Conversation selected:', id)
      console.log('[LiaThread] 🔵 Current activeConversationId:', activeConversationId)
      setActiveConversationId(id)
      // React Query automatically fetches from cache if available!
      // useConversation(id) hook will handle the rest
    },
    [setActiveConversationId, activeConversationId]
  )

  // Handle rename
  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      try {
        await renameConversation(id, newTitle)
      } catch (error) {
        console.error('Failed to rename conversation:', error)
      }
    },
    [renameConversation]
  )

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await softDeleteConversation(id)
        // If deleted conversation was active, clear it
        if (id === activeConversationId) {
          setActiveConversationId(null)
          clearMessages()
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error)
      }
    },
    [softDeleteConversation, activeConversationId, clearMessages]
  )

  return (
    <ThreadLayout
      colorScheme="custom"
      customTheme={greenPulseThreadTheme}
      sidebarToggle={
        // Only show sidebar toggle if authenticated
        isAuthenticated ? (
          <ThreadSidebarToggle
            className="fixed right-4 top-20 z-50 md:hidden shadow-lg backdrop-blur-sm bg-[#10b981] hover:bg-[#059669] text-white"
            variant="default"
          />
        ) : undefined
      }
      sidebar={
        // Only show conversations list if authenticated
        isAuthenticated ? (
          <ThreadSidebar
            conversations={conversations}
            activeConversationId={activeConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onRename={handleRename}
            onDelete={handleDelete}
            newConversationLabel="New Chat"
            emptyState="Start a new conversation to get insights from LIA"
          />
        ) : undefined
      }
    >
      <Thread messages={messages} streamingText={streamingText}>
        <ThreadMessages
          messages={messages}
          loading={loading}
          streamingText={streamingText}
          isNewThread={isNewThread}
          loadingText="LIA is thinking"
          onRetry={resendLastMessage}
          onEdit={editMessage}
          formatResponseTime={time => `${(time / 1000).toFixed(2)}s`}
        />
      </Thread>

      <ThreadComposer
        onSubmit={sendMessage}
        loading={loading}
        placeholder="Ask GP.A anything about sustainability..."
        isNewThread={isNewThread}
        welcomeMessage={
          <ThreadWelcome
            show={isNewThread}
            title="Welcome to GP.A"
            description="Your AI assistant for sustainability and ESG reporting"
          />
        }
        headerSlot={
          providers.length > 0 && selectedProvider && onProviderChange ? (
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <AISelector
                value={selectedProvider}
                onChange={onProviderChange}
                providers={providers}
                showCapabilities={true}
              />
            </div>
          ) : null
        }
      />
    </ThreadLayout>
  )
}
