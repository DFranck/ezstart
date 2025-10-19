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
      formatRequest: (message: string) => {
        const payload: any = {
          message,
          extract_esg: false,
          session_id: sessionId,
        }
        // Only include conversation_id if it exists (avoid sending null)
        if (activeConversationId) {
          payload.conversation_id = activeConversationId
        }
        return payload
      },
      formatResponse: (data: any) => {
        return data.data?.response || data.response || 'No response'
      },
      onSuccess: (data: any) => {
        // Save conversation_id for subsequent messages
        if (data.data?.conversation_id && !activeConversationId) {
          console.log('✅ Conversation created:', data.data.conversation_id)
          setActiveConversationId(data.data.conversation_id)
        }
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
