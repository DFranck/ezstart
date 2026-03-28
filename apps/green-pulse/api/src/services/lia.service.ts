/**
 * LIA (Language Intelligence Agent) Service
 *
 * Uses @ezstart/ai-sdk for reusable AI chat
 * Configured for GreenPulse ESG assistance
 */

import { logger } from '@ezstart/logger/server'
import { AIAgent } from '@ezstart/ai-sdk'
import type { ESGPayload } from '@green-pulse/types'
import { Conversation } from '../models/Conversation.js'

// System prompts for different modes
const SYSTEM_PROMPT_GENERAL = `You are GreenPulse.AI, an ESG advisor for SMEs in Southeast Asia.
Speak clearly and practically. When the user shares data, confirm assumptions, surface missing fields,
and prepare normalized JSON for ESG reporting.`

const SYSTEM_PROMPT_EXTRACTION = `You are a structured extractor. From the conversation text,
output ONLY valid JSON conforming to the ESG schema (company, sites, period, scopes, targets, evidence).
Do not include explanations. Fill missing values with null and list them in _missing.`

/**
 * General ESG Chat Agent
 * For natural conversations about ESG topics
 */
export const liaAgent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4o',
  preprompt: SYSTEM_PROMPT_GENERAL,
  temperature: 0.7,

  // Hook: Before sending request
  beforeRequest: async (context) => {
    logger.info(`[LIA] User ${context.userId || 'anonymous'}: ${context.message.substring(0, 100)}`)
    return context
  },

  // Hook: After receiving response
  afterResponse: async (context) => {
    logger.info(`[LIA] AI response: ${context.response.substring(0, 100)}...`)

    // Save to conversation if conversationId provided
    if (context.conversationId) {
      try {
        // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
        await Conversation.findByIdAndUpdate(context.conversationId, {
          $push: {
            messages: [
              {
                role: 'user',
                content: context.message,
                timestamp: new Date(),
              },
              {
                role: 'assistant',
                content: context.response,
                timestamp: new Date(),
              },
            ],
          },
        })
        logger.info(`✅ Saved to conversation: ${context.conversationId}`)
      } catch (error) {
        logger.error('❌ Failed to save conversation:', error)
        // Don't fail the request
      }
    }

    return context
  },

  // Hook: On error
  onError: async (error, context) => {
    logger.error('[LIA] Error:', error.message)
    logger.error('  User:', context.userId || 'anonymous')
    logger.error('  Message:', context.message.substring(0, 100))
  }
})

/**
 * ESG Extraction Agent
 * For structured data extraction
 */
export const esgExtractionAgent = new AIAgent({
  provider: 'openai',
  model: 'gpt-4o',
  preprompt: SYSTEM_PROMPT_EXTRACTION,
  temperature: 0.1, // Low temp for consistency

  // Hook: Parse and validate JSON response
  afterResponse: async (context) => {
    try {
      const extracted = JSON.parse(context.response) as ESGPayload
      context.metadata = { extractedData: extracted }
      logger.info(`[ESG Extraction] Successfully extracted data for ${extracted.company?.name || 'unknown company'}`)
    } catch (error) {
      logger.error('[ESG Extraction] Failed to parse JSON:', error)
      context.metadata = { extractedData: null, error: 'Failed to parse extracted data' }
    }
    return context
  }
})

/**
 * Chat with optional ESG extraction
 * Maintains conversation history
 */
export async function chatWithLIA(
  message: string,
  options: {
    extractEsg?: boolean
    conversationId?: string
    userId?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  } = {}
): Promise<{
  response: string
  extractedData?: ESGPayload | null
  conversationId?: string
}> {
  const { extractEsg = false, conversationId, userId, history = [] } = options

  // Use appropriate agent
  const agent = extractEsg ? esgExtractionAgent : liaAgent

  // Send message with context
  const result = await agent.chat(message, {
    conversationId,
    userId,
    history: history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  })

  return {
    response: result.text,
    extractedData: result.metadata?.extractedData,
    conversationId,
  }
}

/**
 * Validate ESG data using AI
 */
export async function validateEsgData(payload: ESGPayload): Promise<{ ok: boolean; errors?: string[] }> {
  const validationAgent = new AIAgent({
    provider: 'openai',
    model: 'gpt-4o-mini',
    preprompt: 'You are a data validator. Return only JSON.',
    temperature: 0,
  })

  const validationPrompt = `Validate this ESG data JSON against business rules:
- All numbers must be >= 0
- Period format must be YYYY, YYYY-Q#, or YYYY-MM
- Scope2 items must have site_id
- Company country must be 2-letter code
Return {"ok": true} or {"ok": false, "errors": [...]}`

  const result = await validationAgent.chat(`${validationPrompt}\n\nData: ${JSON.stringify(payload)}`)

  try {
    return JSON.parse(result.text)
  } catch (error) {
    return { ok: false, errors: ['Validation service error'] }
  }
}
