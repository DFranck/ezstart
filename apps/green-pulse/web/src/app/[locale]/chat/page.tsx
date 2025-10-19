'use client'

import { LiaThread } from '@/components/lia/LiaThread'
import { ThreadProvider } from '@/components/lia/ThreadProvider'
import { getApiUrl } from '@ezstart/config'
import { useMemo, useState } from 'react'

export default function LiaPage() {
  const sessionId = useMemo(() => `lia_${Date.now()}`, [])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const config = useMemo(
    () => ({
      endpoint: `${getApiUrl('green-pulse')}/api/chat`,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
      },
      formatRequest: (message: string) => ({
        message,
        extract_esg: false,
        session_id: sessionId,
        conversation_id: activeConversationId, // Pass active conversation
      }),
      formatResponse: (data: any) => {
        return data.data?.response || data.response || 'No response'
      },
      onError: (error: Error) => {
        console.error('LIA Chat Error:', error)
      },
    }),
    [sessionId, activeConversationId]
  ) // Re-create when activeConversationId changes

  return (
    <ThreadProvider config={config}>
      <LiaThread
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
      />
    </ThreadProvider>
  )
}
