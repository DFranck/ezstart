/**
 * useAIChat Hook
 * Main hook for AI chat functionality
 */
'use client'

import { useState, useCallback } from 'react'
import { useAIStore } from '../store/aiStore.js'
import { callApi } from '@ezstart/fetch-client'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: any
}

interface UseAIChatOptions {
  conversationId?: string
  systemPrompt?: string
  extractData?: boolean
  appName?: string
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { selectedProvider, setSelectedProvider, providers } = useAIStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)

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
        const response = await callApi('/chat', {
          method: 'POST',
          body: {
            message: content,
            providerId: selectedProvider,
            conversation_id: options.conversationId,
            extract_esg: options.extractData,
          },
          appName: options.appName || 'green-pulse',
        })

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
          metadata: response.data.extracted_data
            ? { extractedData: response.data.extracted_data }
            : undefined,
        }
        setMessages(prev => [...prev, assistantMessage])

        // Save extracted data
        if (response.data.extracted_data) {
          setExtractedData(response.data.extracted_data)
        }
      } catch (error) {
        console.error('Chat error:', error)
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
