'use client'

import { callApi } from '@/utils/api'
import { Button, Div, Icon, Input, P, Span } from '@ezstart/ui/components'
import { useState, useEffect } from 'react'

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
  currency?: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'VND' | 'THB' | 'AUD' | 'CAD' | 'CNY' | 'CHF'
  taxRate?: number
}

interface InvoiceAIAssistantProps {
  onDataExtracted: (data: ExtractedInvoiceData) => void
  isCollapsed?: boolean
  onToggle?: () => void
  initialHistory?: Message[] // Load existing conversation
  onHistoryChange?: (history: Message[]) => void // Save conversation on each message
  currentInvoiceData?: ExtractedInvoiceData // Current invoice content for context
}

export function InvoiceAIAssistant({
  onDataExtracted,
  isCollapsed = false,
  onToggle,
  initialHistory,
  onHistoryChange,
  currentInvoiceData,
}: InvoiceAIAssistantProps) {
  // Generate initial message based on context
  const getInitialMessage = (): Message => {
    if (currentInvoiceData && currentInvoiceData.items && currentInvoiceData.items.length > 0) {
      // Editing existing invoice - provide context
      const itemsCount = currentInvoiceData.items.length
      const totalHours = currentInvoiceData.items.reduce((sum, item) => sum + item.quantity, 0)
      return {
        role: 'assistant',
        content: `Hi! I can see you're editing an invoice with ${itemsCount} items (${totalHours} hours total). How can I help you improve it?

Examples:
- "Shorten the descriptions"
- "Make descriptions more readable"
- "Add bullet points to items"
- "Change date format"`,
      }
    }
    // Creating new invoice
    return {
      role: 'assistant',
      content:
        "Hi! I'm your invoice assistant. Tell me about the invoice you want to create, and I'll fill in the details for you. Try: 'Invoice for John Doe, 3 hours consulting at $50/hr'",
    }
  }

  const [messages, setMessages] = useState<Message[]>(
    initialHistory && initialHistory.length > 0
      ? initialHistory
      : [getInitialMessage()]
  )
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Save conversation history on every message change
  useEffect(() => {
    if (onHistoryChange && messages.length > 0) {
      onHistoryChange(messages)
    }
  }, [messages, onHistoryChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Prepare context message if editing existing invoice
      let contextualInput = input
      if (currentInvoiceData && currentInvoiceData.items && currentInvoiceData.items.length > 0 && messages.length <= 2) {
        // First user message when editing - add context
        const currentContext = `Current invoice has ${currentInvoiceData.items.length} items:\n${currentInvoiceData.items.map((item, i) => `${i + 1}. ${item.label} (${item.quantity}h @ $${item.price}/h)`).join('\n')}\n\nUser request: ${input}`
        contextualInput = currentContext
      }

      // Call AI extraction API
      const response = await callApi<{
        success: boolean
        data: ExtractedInvoiceData
        rawResponse?: string
      }>('/ai/extract-invoice-data', {
        method: 'POST',
        body: {
          text: contextualInput,
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
        className="absolute top-2 right-12 z-10 bg-primary/10 hover:bg-primary/20 border-primary/30 backdrop-blur-sm"
      >
        <Icon name="lucide:Sparkles" className="mr-2 text-primary" />
        <span className="hidden sm:inline">AI Assistant</span>
        <span className="sm:hidden">AI</span>
      </Button>
    )
  }

  return (
    <Div className="flex flex-col h-[60vh] sticky top-0 border-l border bg-muted/30 backdrop-blur-sm ">
      {/* Header */}
      <Div className="flex items-center justify-between p-3 sm:p-4 border-b border bg-card/60 backdrop-blur-md">
        <Div className="flex items-center gap-2">
          <Icon name="lucide:Sparkles" className="text-primary w-5 h-5" />
          <Span className="font-semibold text-sm sm:text-base text-primary">AI Assistant</Span>
        </Div>
        {onToggle && (
          <Button onClick={onToggle} variant="ghost" size="sm" className="hover:bg-muted/50">
            <Icon name="lucide:ChevronRight" className="w-4 h-4" />
          </Button>
        )}
      </Div>

      {/* Messages */}
      <Div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.map((message, index) => (
          <Div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Div
              className={`max-w-[85%] sm:max-w-[80%] rounded-xl p-2.5 sm:p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card/80 backdrop-blur-sm border shadow-sm'
              }`}
            >
              <P className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                {message.content}
              </P>
            </Div>
          </Div>
        ))}
        {isLoading && (
          <Div className="flex justify-start">
            <Div className="bg-card/80 backdrop-blur-sm border rounded-xl p-2.5 sm:p-3 shadow-sm">
              <P className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                <Icon name="lucide:Loader2" className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                Extracting data...
              </P>
            </Div>
          </Div>
        )}
      </Div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border bg-card/60 backdrop-blur-md"
      >
        <Div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe the invoice..."
            disabled={isLoading}
            className="flex-1 text-xs sm:text-sm bg-background backdrop-blur-sm focus:border-primary focus:ring-primary/20"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
          >
            <Icon name="lucide:Send" className="w-4 h-4" />
          </Button>
        </Div>
      </form>
    </Div>
  )
}
