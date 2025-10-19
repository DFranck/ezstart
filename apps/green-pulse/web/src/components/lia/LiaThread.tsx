'use client'

import { useConversations } from '@/hooks/useConversations'
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
}

export function LiaThread({
  activeConversationId,
  setActiveConversationId,
  onRegisterConversationCreatedCallback
}: LiaThreadProps) {
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

  // Register callback to reload conversations when auto-created
  useEffect(() => {
    if (onRegisterConversationCreatedCallback) {
      onRegisterConversationCreatedCallback(() => loadConversations)
    }
  }, [onRegisterConversationCreatedCallback, loadConversations])

  // Load messages from cache when conversationData changes
  useEffect(() => {
    if (conversationData && conversationData.messages) {
      const threadMessages = conversationData.messages.map((msg: any) => ({
        id: `${msg.role}-${msg.timestamp.getTime()}`,
        role: msg.role === 'assistant' ? 'ai' : msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }))
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
      setActiveConversationId(id)
      // React Query automatically fetches from cache if available!
      // useConversation(id) hook will handle the rest
    },
    [setActiveConversationId]
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
      colorScheme="green"
      mobileFooterOffset="pb-16" // 64px for mobile bottom nav
      sidebarToggle={
        <ThreadSidebarToggle
          className="fixed left-4 bottom-20 z-50 md:hidden shadow-lg backdrop-blur-sm bg-green-600 hover:bg-green-700 text-white"
          variant="default"
        />
      }
      sidebar={
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
        placeholder="Ask LIA anything about sustainability..."
        isNewThread={isNewThread}
        welcomeMessage={
          <ThreadWelcome
            show={isNewThread}
            title="Welcome to LIA"
            description="Your AI assistant for sustainability and ESG reporting"
          />
        }
      />
    </ThreadLayout>
  )
}
