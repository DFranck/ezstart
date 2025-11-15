/**
 * POST /api/ai/extract-invoice-data
 * Extract invoice/quote data from natural language text
 */
import { Request, Response } from 'express'
import { OpenAIProvider } from '@ezstart/ai-sdk'

interface ExtractInvoiceRequest {
  text: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
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

export async function extractInvoiceData(req: Request, res: Response) {
  try {
    const { text, conversationHistory } = req.body as ExtractInvoiceRequest

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid text parameter',
      })
    }

    // Initialize OpenAI provider
    const aiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini', // Fast and cheap for extraction
    })

    // Build context from conversation history
    let contextPrompt = ''
    if (conversationHistory && conversationHistory.length > 0) {
      contextPrompt = '\n\nPrevious conversation:\n'
      conversationHistory.forEach(msg => {
        contextPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
      })
    }

    const prompt = `You are an invoice extraction assistant. Extract invoice/quote data from the following text.${contextPrompt}

Current user message: "${text}"

Extract and return ONLY a valid JSON object with this structure (omit fields if not mentioned):
{
  "clientName": "string (client/customer name)",
  "items": [
    {
      "label": "string (item/service description)",
      "quantity": number,
      "price": number (unit price)
    }
  ],
  "description": "string (overall invoice description)",
  "dueDate": "YYYY-MM-DD (if mentioned, otherwise omit)",
  "notes": "string (any additional notes)",
  "currency": "USD or EUR (default to USD if not specified)",
  "taxRate": number (percentage, e.g., 20 for 20%, omit if not mentioned)
}

Examples:
User: "Invoice for John Doe, 3 hours consulting at $50/hr"
Response: {"clientName":"John Doe","items":[{"label":"Consulting","quantity":3,"price":50}],"currency":"USD"}

User: "Quote for ABC Corp: 2 laptops at 1200€ each, 1 monitor at 300€"
Response: {"clientName":"ABC Corp","items":[{"label":"Laptop","quantity":2,"price":1200},{"label":"Monitor","quantity":1,"price":300}],"currency":"EUR"}

Return ONLY the JSON object, no markdown, no explanation.`

    const response = await aiProvider.sendMessage(prompt, {
      systemPrompt: 'You are an invoice extraction assistant. Extract data and return JSON only.',
      temperature: 0.3,
      history: conversationHistory?.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const result = response.text

    // Parse the AI response
    let extractedData: ExtractedInvoiceData
    try {
      // Clean potential markdown code blocks
      const cleanedResult = result.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      extractedData = JSON.parse(cleanedResult)
    } catch (parseError) {
      console.error('Failed to parse AI response:', result)
      return res.status(500).json({
        error: 'Failed to parse invoice data from AI response',
        rawResponse: result,
      })
    }

    res.json({
      success: true,
      data: extractedData,
      rawResponse: result, // For debugging
    })
  } catch (error: any) {
    console.error('Error extracting invoice data:', error)
    res.status(500).json({
      error: 'Failed to extract invoice data',
      message: error.message,
    })
  }
}
