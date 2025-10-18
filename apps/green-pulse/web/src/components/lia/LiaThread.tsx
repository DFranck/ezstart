'use client'

import {
  Conversation,
  Thread,
  ThreadComposer,
  ThreadLayout,
  ThreadMessages,
  ThreadSidebar,
  ThreadWelcome,
} from '@ezstart/ui/components'
import { useCallback } from 'react'
import { useThreadContext } from './ThreadProvider'
import { useConversations } from '@/hooks/useConversations'

type LiaThreadProps = {
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
}

export function LiaThread({ activeConversationId, setActiveConversationId }: LiaThreadProps) {
  const { messages, loading, streamingText, sendMessage, resendLastMessage, isNewThread, clearMessages, loadMessages } =
    useThreadContext()

  const {
    conversations: apiConversations,
    loading: conversationsLoading,
    createConversation,
    renameConversation,
    softDeleteConversation,
    loadConversation,
  } = useConversations()

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
  }, [createConversation, clearMessages])

  // Handle conversation select
  const handleConversationSelect = useCallback(async (id: string) => {
    try {
      setActiveConversationId(id)

      // Load conversation with messages
      const conversation = await loadConversation(id)
      if (conversation && conversation.messages) {
        // Convert API messages to ThreadMessage format
        const threadMessages = conversation.messages.map((msg: any) => ({
          id: `${msg.role}-${msg.timestamp.getTime()}`,
          role: msg.role === 'assistant' ? 'ai' : msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        }))
        loadMessages(threadMessages)
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error)
    }
  }, [loadConversation, loadMessages, setActiveConversationId])

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
      headerOffset="top-16"
      sidebar={
        <ThreadSidebar
          conversations={conversations}
          activeConversationId={activeConversationId || undefined}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
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
