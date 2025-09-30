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
import { useState } from 'react'
import { useThreadContext } from './ThreadProvider'

export function LiaThread() {
  const { messages, loading, streamingText, sendMessage, resendLastMessage, isNewThread } =
    useThreadContext()

  // Mock conversations - À remplacer par vraies données
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      title: 'ESG Report Analysis',
      preview: 'Can you help me analyze our ESG data...',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      unread: false,
    },
    {
      id: '2',
      title: 'Carbon Footprint',
      preview: 'What are best practices for reducing...',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      unread: true,
    },
  ])

  const [activeConversationId, setActiveConversationId] = useState('1')

  return (
    <ThreadLayout
      headerOffset="top-16" // Adjust based on your header height
      sidebar={
        <ThreadSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={setActiveConversationId}
          onNewConversation={() => console.log('New conversation')}
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
