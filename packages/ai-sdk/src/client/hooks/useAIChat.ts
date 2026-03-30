/**
 * useAIChat Hook
 * Main hook for AI chat functionality
 */
'use client'

import { logger } from '@ezstart/logger'
import { useState, useCallback } from 'react'
import { useAIStore } from '../store/aiStore.js'
import { callApi } from '@ezstart/fetch-client'
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
  extractData?: boolean
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
        const response = await callApi<{ response: string; extracted_data?: unknown }>('/chat', {
          method: 'POST',
          body: {
            message: content,
            providerId: selectedProvider,
            conversation_id: options.conversationId,
            extract_esg: options.extractData,
          },
          appName: options.appName || 'green-pulse',
        })

        if (!response.ok || !response.data) throw new Error('Empty response from AI')
        const data = response.data

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          metadata: data.extracted_data ? { extractedData: data.extracted_data } : undefined,
        }
        setMessages(prev => [...prev, assistantMessage])

        // Save extracted data
        if (data.extracted_data) {
          setExtractedData(data.extracted_data)
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
