/**
 * useAIChat Hook
 * Main hook for AI chat functionality
 */
'use client'

import { logger } from '@ezstart/logger'
import { useState, useCallback } from 'react'
import { useAIStore } from '../store/aiStore.js'
import { apiCall } from '@ezstart/api-sdk'
import type { AppName } from '@ezstart/config/urls'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface UseAIChatOptions {
  conversationId?: string
  systemPrompt?: string
  appName?: AppName
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { selectedProvider, setSelectedProvider, providers } = useAIStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<unknown>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      setLoading(true)

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, userMessage])

      try {
        const data = await apiCall<{ response: string; extractedData?: unknown }>('/ai/chat', {
          method: 'POST',
          body: {
            message: content,
            providerId: selectedProvider,
            conversationId: options.conversationId,
          },
          appName: options.appName || 'ezstart',
        })

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          metadata: data.extractedData ? { extractedData: data.extractedData } : undefined,
        }
        setMessages(prev => [...prev, assistantMessage])

        // Save extracted data
        if (data.extractedData) {
          setExtractedData(data.extractedData)
        }
      } catch (error) {
        logger.error('Chat error:', error instanceof Error ? error.message : String(error))
        // Add error message
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setLoading(false)
      }
    },
    [selectedProvider, options]
  )

  return {
    messages,
    loading,
    selectedProvider,
    setSelectedProvider,
    providers,
    sendMessage,
    extractedData,
    clearMessages: () => setMessages([]),
  }
}
