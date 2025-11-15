/**
 * POST /api/ai/extract-invoice-data
 * Extract invoice/quote data from natural language text
 */
import { Request, Response } from 'express'
import { extractInvoiceData as extractWithGemini } from '../../services/gemini.service'

interface ExtractInvoiceRequest {
  text: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function extractInvoiceData(req: Request, res: Response) {
  try {
    const { text, conversationHistory } = req.body as ExtractInvoiceRequest

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid text parameter',
      })
    }

    // Extract data using Gemini
    const extractedData = await extractWithGemini(text, conversationHistory)

    res.json({
      success: true,
      data: extractedData,
    })
  } catch (error: any) {
    console.error('Error extracting invoice data:', error)
    res.status(500).json({
      error: 'Failed to extract invoice data',
      message: error.message,
    })
  }
}
