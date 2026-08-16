/**
 * POST /api/ai/extract-invoice-data
 * Conversational AI assistant for invoice/quote creation
 */
import { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError, sendValidationError } from '@ezstart/api-core'
import {
  chatWithInvoiceAssistant,
  type ExtractedInvoiceData,
} from '../../services/gemini.service.js'

const extractInvoiceBodySchema = z.object({
  text: z.string().min(1, 'Text is required').describe('User message to the AI assistant'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']).describe('Message sender role'),
        content: z.string().describe('Message content'),
      })
    )
    .optional()
    .describe('Previous conversation messages for context'),
  currentInvoiceData: z.record(z.unknown()).optional().describe('Current invoice form data'),
  billingType: z.enum(['itemized', 'flat-rate']).optional().describe('Invoice billing type'),
})

export async function extractInvoiceData(req: Request, res: Response) {
  try {
    const parsed = extractInvoiceBodySchema.safeParse(req.body)

    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.errors)
    }

    const { text, conversationHistory, currentInvoiceData, billingType } = parsed.data

    // Use conversational AI with function calling
    const response = await chatWithInvoiceAssistant(
      text,
      conversationHistory as Array<{ role: 'user' | 'assistant'; content: string }>,
      currentInvoiceData as ExtractedInvoiceData | undefined,
      billingType
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
