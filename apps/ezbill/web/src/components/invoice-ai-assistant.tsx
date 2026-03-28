'use client'

import { callApi } from '@/config/api'
import { Button, Div, Icon, Span, Thread, ThreadMessage, ThreadComposer } from '@ezstart/ui/components'
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

// Action types from backend
export type InvoiceAction =
  | { type: 'update_items'; items: Array<{ label: string; quantity: number; price: number }> }
  | { type: 'add_items'; items: Array<{ label: string; quantity: number; price: number }> }
  | { type: 'remove_items'; indices: number[] }
  | { type: 'update_client'; clientName: string }
  | { type: 'update_description'; description: string }
  | { type: 'update_payment_terms'; notes: string }
  | {
      type: 'update_currency'
      currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'VND' | 'THB' | 'AUD' | 'CAD' | 'CNY' | 'CHF'
    }
  | { type: 'update_due_date'; dueDate: string }
  | { type: 'update_tax_rate'; taxRate: number }
  | { type: 'replace_all'; data: ExtractedInvoiceData }

interface InvoiceAIAssistantProps {
  onDataExtracted: (data: ExtractedInvoiceData) => void
  onAction?: (action: InvoiceAction) => void // NEW: Handle incremental actions
  isCollapsed?: boolean
  onToggle?: () => void
  initialHistory?: Message[] // Load existing conversation
  onHistoryChange?: (history: Message[]) => void // Save conversation on each message
  currentInvoiceData?: ExtractedInvoiceData // Current invoice content for context
}

export function InvoiceAIAssistant({
  onDataExtracted,
  onAction,
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
  const [isLoading, setIsLoading] = useState(false)

  // Save conversation history on every message change
  useEffect(() => {
    if (onHistoryChange && messages.length > 0) {
      onHistoryChange(messages)
    }
  }, [messages, onHistoryChange])

  const handleSubmit = async (inputMessage: string) => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Call conversational AI API with current invoice context
      const response = await callApi<{
        success: boolean
        action: InvoiceAction
        message: string
        suggestions?: string[]
        conversationState?: string
      }>('/ai/extract-invoice-data', {
        method: 'POST',
        body: {
          text: inputMessage,
          conversationHistory: messages,
          currentInvoiceData, // Send current form data for context
        },
      })

      if (response.ok && response.data?.success) {
        const { action, message: aiMessage, suggestions } = response.data

        // Add assistant response with suggestions
        // Format suggestions as bullet points
        const formattedSuggestions = suggestions
          ? `\n\n${suggestions.map(s => `• ${s}`).join('\n')}`
          : ''

        const assistantMessage: Message = {
          role: 'assistant',
          content: `${aiMessage}${formattedSuggestions}`,
        }

        setMessages(prev => [...prev, assistantMessage])

        // Handle action incrementally
        if (onAction) {
          // NEW: Use action handler for incremental updates
          onAction(action)
        } else {
          // FALLBACK: Convert action to data for backward compatibility
          const extractedData = actionToData(action)
          if (extractedData) {
            onDataExtracted(extractedData)
          }
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: "Sorry, I couldn't understand that. Can you try rephrasing?",
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('AI conversation error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Oops! Something went wrong. Please try again.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper: Convert action to data for backward compatibility
  const actionToData = (action: InvoiceAction): ExtractedInvoiceData | null => {
    switch (action.type) {
      case 'replace_all':
        return action.data
      case 'update_items':
      case 'add_items':
        return { items: action.items }
      case 'update_client':
        return { clientName: action.clientName }
      case 'update_currency':
        return { currency: action.currency }
      case 'update_payment_terms':
        return { notes: action.notes }
      case 'update_due_date':
        return { dueDate: action.dueDate }
      case 'update_tax_rate':
        return { taxRate: action.taxRate }
      case 'update_description':
        return { description: action.description }
      default:
        return null
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
    <Div className="flex flex-col h-[60vh] sticky top-0 border-l border bg-muted/30 backdrop-blur-sm">
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

      {/* Messages using Thread component */}
      <Thread className="flex-1 p-0 bg-transparent">
        {messages.map((message, index) => (
          <ThreadMessage
            key={index}
            role={message.role === 'assistant' ? 'ai' : 'user'}
            userBubbleClassName="bg-primary text-primary-foreground shadow-md text-xs sm:text-sm"
            aiBubbleClassName="bg-card/80 backdrop-blur-sm border shadow-sm text-xs sm:text-sm"
            showCopyButton={false}
          >
            {message.content}
          </ThreadMessage>
        ))}
        {isLoading && (
          <ThreadMessage
            role="ai"
            aiBubbleClassName="bg-card/80 backdrop-blur-sm border shadow-sm text-xs sm:text-sm"
            showCopyButton={false}
          >
            <Div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="lucide:Loader2" className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
              Extracting data...
            </Div>
          </ThreadMessage>
        )}
      </Thread>

      {/* Input using ThreadComposer */}
      <ThreadComposer
        onSubmit={handleSubmit}
        loading={isLoading}
        placeholder="Describe the invoice..."
        sendLabel="Send invoice request"
        className="border-t border bg-card/60 backdrop-blur-md pb-0"
      />
    </Div>
  )
}
