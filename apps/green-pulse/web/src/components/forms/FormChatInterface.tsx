'use client'

import { useState, useRef, useEffect } from 'react'
import { logger } from '@ezstart/logger'
import { Button, Card, CardContent, Div, Input, P } from '@ezstart/ui/components'
import { useExtractFormData } from '@/hooks/useForms'
import type { FormConfig } from '@green-pulse/types'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface FormChatInterfaceProps {
  formConfig: FormConfig
  formInstanceId: string
  extractedFields: Record<string, any>
  onFieldsUpdate: (fields: Record<string, any>) => void
  disabled?: boolean
}

export function FormChatInterface({
  formConfig,
  extractedFields,
  onFieldsUpdate,
  disabled,
}: FormChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        formConfig.extraction?.systemPrompt ||
        "Hello! I'm here to help you fill out this form. Just talk naturally about the information.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const extractMutation = useExtractFormData()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || disabled) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsExtracting(true)

    try {
      // Call AI extraction API
      const conversationHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const result = await extractMutation.mutateAsync({
        formConfigId: formConfig.id,
        conversationHistory,
      })

      const extractionData = result?.data

      if (extractionData) {
        // Update extracted fields
        const newFields = { ...extractedFields, ...extractionData.extractedFields }
        onFieldsUpdate(newFields)

        // Add AI response
        const aiResponse: Message = {
          role: 'assistant',
          content:
            extractionData.aiResponse || "Thanks! I've extracted that information. Anything else?",
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiResponse])

        // Show missing fields if any
        if (extractionData.missingFields?.length > 0) {
          const missingSummary: Message = {
            role: 'system',
            content: `Still need: ${extractionData.missingFields.join(', ')}`,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, missingSummary])
        }
      }
    } catch (error) {
      logger.error('Extraction failed:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try rephrasing?',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsExtracting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Div className="flex flex-col h-full">
      {/* Messages Area */}
      <Div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <Div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.role === 'system'
                    ? 'bg-muted'
                    : 'bg-card'
              }`}
            >
              <CardContent className="p-3">
                <P className="text-sm whitespace-pre-wrap">{message.content}</P>
                <P className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</P>
              </CardContent>
            </Card>
          </Div>
        ))}

        {isExtracting && (
          <Div className="flex justify-start">
            <Card className="bg-muted">
              <CardContent className="p-3">
                <P className="text-sm">Analyzing and extracting...</P>
              </CardContent>
            </Card>
          </Div>
        )}

        <Div ref={messagesEndRef} />
      </Div>

      {/* Input Area */}
      <Div className="border-t p-4">
        <Div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              disabled
                ? 'Form submitted - no more editing'
                : 'Type your message... (e.g., "The company is ABC Corp, located in Paris, France")'
            }
            disabled={disabled || isExtracting}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim() || disabled || isExtracting}>
            Send
          </Button>
        </Div>

        {formConfig.extraction?.fields && (
          <Div className="mt-3">
            <P className="text-xs text-muted-foreground">
              💡 I can extract:{' '}
              {formConfig.extraction.fields
                .map(f => f.label)
                .slice(0, 5)
                .join(', ')}
              {formConfig.extraction.fields.length > 5 &&
                ` and ${formConfig.extraction.fields.length - 5} more`}
            </P>
          </Div>
        )}
      </Div>
    </Div>
  )
}
