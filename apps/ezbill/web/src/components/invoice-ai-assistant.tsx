'use client'

import { callApi } from '@/utils/api'
import { Button, Div, Icon, Input, P, Span } from '@ezstart/ui/components'
import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ExtractedInvoiceData {
  clientName?: string
  items?: Array<{
    label: string
    quantity: number
    price: number
  }>
  description?: string
  dueDate?: string
  notes?: string
  currency?: 'USD' | 'EUR'
  taxRate?: number
}

interface InvoiceAIAssistantProps {
  onDataExtracted: (data: ExtractedInvoiceData) => void
  isCollapsed?: boolean
  onToggle?: () => void
}

export function InvoiceAIAssistant({
  onDataExtracted,
  isCollapsed = false,
  onToggle,
}: InvoiceAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your invoice assistant. Tell me about the invoice you want to create, and I'll fill in the details for you. Try: 'Invoice for John Doe, 3 hours consulting at $50/hr'",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call AI extraction API
      const response = await callApi<{
        success: boolean
        data: ExtractedInvoiceData
        rawResponse?: string
      }>('/ai/extract-invoice-data', {
        method: 'POST',
        body: {
          text: input,
          conversationHistory: messages,
        },
      })

      if (response.ok && response.data?.success) {
        const extractedData = response.data.data

        // Add assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: `Got it! I've extracted the following:\n${extractedData.clientName ? `• Client: ${extractedData.clientName}\n` : ''}${extractedData.items ? `• Items: ${extractedData.items.map(i => `${i.label} (${i.quantity}x $${i.price})`).join(', ')}\n` : ''}${extractedData.description ? `• Description: ${extractedData.description}\n` : ''}${extractedData.dueDate ? `• Due Date: ${extractedData.dueDate}\n` : ''}${extractedData.currency ? `• Currency: ${extractedData.currency}\n` : ''}\nI'll fill in the form now!`,
        }

        setMessages(prev => [...prev, assistantMessage])

        // Send extracted data to parent component to fill the form
        onDataExtracted(extractedData)
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: "Sorry, I couldn't extract invoice data from that. Can you try rephrasing?",
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('AI extraction error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Oops! Something went wrong. Please try again.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (isCollapsed) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 z-10"
      >
        <Icon name="lucide:Sparkles" className="mr-2" />
        AI Assistant
      </Button>
    )
  }

  return (
    <Div className="flex flex-col h-full border-l border-border bg-muted/20">
      {/* Header */}
      <Div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Div className="flex items-center gap-2">
          <Icon name="lucide:Sparkles" className="text-ezbill-invoice" />
          <Span className="font-semibold">AI Assistant</Span>
        </Div>
        {onToggle && (
          <Button onClick={onToggle} variant="ghost" size="sm">
            <Icon name="lucide:X" />
          </Button>
        )}
      </Div>

      {/* Messages */}
      <Div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <Div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-ezbill-invoice text-white'
                  : 'bg-card border border-border'
              }`}
            >
              <P className="text-sm whitespace-pre-line">{message.content}</P>
            </Div>
          </Div>
        ))}
        {isLoading && (
          <Div className="flex justify-start">
            <Div className="bg-card border border-border rounded-lg p-3">
              <P className="text-sm text-muted-foreground">Extracting data...</P>
            </Div>
          </Div>
        )}
      </Div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
        <Div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe the invoice..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="sm">
            <Icon name="lucide:Send" />
          </Button>
        </Div>
      </form>
    </Div>
  )
}
