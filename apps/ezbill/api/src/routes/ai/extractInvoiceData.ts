/**
 * POST /api/ai/extract-invoice-data
 * Conversational AI assistant for invoice/quote creation
 */
import { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { chatWithInvoiceAssistant } from '../../services/gemini.service.js'

const extractInvoiceBodySchema = z.object({
  text: z.string().min(1, 'Text is required'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  currentInvoiceData: z.record(z.unknown()).optional(),
})

export async function extractInvoiceData(req: Request, res: Response) {
  try {
    const parsed = extractInvoiceBodySchema.safeParse(req.body)

    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.errors)
    }

    const { text, conversationHistory, currentInvoiceData } = parsed.data

    // Use conversational AI with function calling
    const response = await chatWithInvoiceAssistant(
      text,
      conversationHistory as Array<{ role: 'user' | 'assistant'; content: string }>,
      currentInvoiceData as any
    )

    sendSuccess(res, {
      action: response.action,
      message: response.message,
      suggestions: response.suggestions,
      conversationState: response.conversationState,
    })
  } catch (error: unknown) {
    logger.error('Error in AI conversation:', error)
    sendError(res, 'Failed to process AI conversation')
  }
}
