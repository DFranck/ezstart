/**
 * POST /api/ai/extract-invoice-data
 * Conversational AI assistant for invoice/quote creation
 */
import { Request, Response } from 'express'
import { chatWithInvoiceAssistant } from '../../services/gemini.service.js'

interface ExtractInvoiceRequest {
  text: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  currentInvoiceData?: {
    clientName?: string
    items?: Array<{ label: string; quantity: number; price: number }>
    description?: string
    dueDate?: string
    notes?: string
    currency?: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'VND' | 'THB' | 'AUD' | 'CAD' | 'CNY' | 'CHF'
    taxRate?: number
  }
}

export async function extractInvoiceData(req: Request, res: Response) {
  try {
    const { text, conversationHistory, currentInvoiceData } = req.body as ExtractInvoiceRequest

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid text parameter',
      })
    }

    // Use conversational AI with function calling
    const response = await chatWithInvoiceAssistant(text, conversationHistory, currentInvoiceData)

    res.json({
      success: true,
      action: response.action,
      message: response.message,
      suggestions: response.suggestions,
      conversationState: response.conversationState,
    })
  } catch (error: any) {
    console.error('Error in AI conversation:', error)
    res.status(500).json({
      error: 'Failed to process AI conversation',
      message: error.message,
    })
  }
}
