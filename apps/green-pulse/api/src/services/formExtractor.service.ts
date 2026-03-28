/**
 * Form Extraction Service
 * Uses AI (Gemini) to extract form field values from natural conversation
 */

import { logger } from '@ezstart/logger/server'
import type { FormConfig, FieldDefinition, ExtractFormDataResponse } from '@green-pulse/types'
import { getFormConfigModel } from '../models/FormConfig.js'
import { chatWithExtraction } from './gemini.service.js'

/**
 * Build extraction prompt for AI based on form configuration
 */
function buildExtractionPrompt(formConfig: FormConfig): string {
  const fieldsDescription = formConfig.extraction.fields
    .map(field => {
      const required = field.required ? '**REQUIRED**' : 'optional'
      const keywords = field.extraction.keywords.join(', ')
      const examples = field.extraction.examples?.join(', ') || 'N/A'

      return `
- **${field.id}** (${field.label}) - ${required}
  Type: ${field.type}
  Keywords: ${keywords}
  Examples: ${examples}
  ${field.helpText ? `Help: ${field.helpText}` : ''}
`
    })
    .join('\n')

  return `${formConfig.extraction.systemPrompt}

## FORM FIELDS TO EXTRACT:

${fieldsDescription}

## YOUR TASK:

1. Extract field values from the user's messages
2. For each field, provide:
   - The extracted value (or null if not mentioned)
   - Confidence score (0-1)
3. List any REQUIRED fields that are still missing
4. Suggest next questions to ask the user to complete missing required fields
5. Respond naturally to the user while collecting information

## OUTPUT FORMAT:

Respond with a JSON object containing:
{
  "extractedFields": { "field_id": "value", ... },
  "confidence": { "field_id": 0.95, ... },
  "missingFields": ["field_id1", "field_id2"],
  "suggestions": ["Next question to ask..."],
  "aiResponse": "Your natural response to the user"
}
`
}

/**
 * Parse AI response and extract structured data
 */
function parseExtractionResponse(
  aiResponse: string,
  fields: FieldDefinition[]
): Partial<ExtractFormDataResponse> {
  try {
    // Try to extract JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn('No JSON found in AI response, returning defaults')
      return {
        extractedFields: {},
        confidence: {},
        missingFields: fields.filter(f => f.required).map(f => f.id),
        suggestions: ['Please provide more information about the form fields'],
        aiResponse: aiResponse,
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and return
    return {
      extractedFields: parsed.extractedFields || {},
      confidence: parsed.confidence || {},
      missingFields: parsed.missingFields || [],
      suggestions: parsed.suggestions || [],
      aiResponse: parsed.aiResponse || aiResponse,
    }
  } catch (error) {
    logger.error('Failed to parse AI extraction response:', error)
    return {
      extractedFields: {},
      confidence: {},
      missingFields: fields.filter(f => f.required).map(f => f.id),
      suggestions: ['Could you provide more details?'],
      aiResponse: aiResponse,
    }
  }
}

/**
 * Validate extracted data against field definitions
 */
function validateExtractedData(
  extractedFields: Record<string, any>,
  fields: FieldDefinition[]
): Record<string, any> {
  const validated: Record<string, any> = {}

  for (const field of fields) {
    const value = extractedFields[field.id]

    if (value === undefined || value === null) {
      continue
    }

    // Type conversion
    switch (field.type) {
      case 'number':
        validated[field.id] = typeof value === 'number' ? value : parseFloat(value)
        break
      case 'boolean':
        validated[field.id] = typeof value === 'boolean' ? value : value === 'true'
        break
      case 'date':
        validated[field.id] = value instanceof Date ? value : new Date(value)
        break
      default:
        validated[field.id] = value
    }

    // Validation rules
    if (field.validation) {
      const val = validated[field.id]

      // Min/max for numbers
      if (field.type === 'number') {
        if (field.validation.min !== undefined && val < field.validation.min) {
          logger.warn(`Field ${field.id} below minimum: ${val} < ${field.validation.min}`)
        }
        if (field.validation.max !== undefined && val > field.validation.max) {
          logger.warn(`Field ${field.id} above maximum: ${val} > ${field.validation.max}`)
        }
      }

      // Pattern validation
      if (field.validation.pattern && typeof val === 'string') {
        const regex = new RegExp(field.validation.pattern)
        if (!regex.test(val)) {
          logger.warn(`Field ${field.id} doesn't match pattern: ${field.validation.pattern}`)
        }
      }
    }
  }

  return validated
}

/**
 * Calculate confidence scores for extracted fields
 */
function calculateConfidence(
  extractedFields: Record<string, any>,
  providedConfidence: Record<string, number>
): Record<string, number> {
  const confidence: Record<string, number> = {}

  for (const fieldId in extractedFields) {
    if (providedConfidence[fieldId] !== undefined) {
      confidence[fieldId] = providedConfidence[fieldId]
    } else {
      // Default confidence based on value presence
      confidence[fieldId] = extractedFields[fieldId] !== null ? 0.8 : 0.0
    }
  }

  return confidence
}

/**
 * Find missing required fields
 */
function findMissingFields(
  extractedFields: Record<string, any>,
  fields: FieldDefinition[]
): string[] {
  const missing: string[] = []

  for (const field of fields) {
    if (field.required) {
      const value = extractedFields[field.id]
      if (value === undefined || value === null || value === '') {
        missing.push(field.id)
      }
    }
  }

  return missing
}

/**
 * Generate suggestions for next questions
 */
function generateSuggestions(
  missingFields: string[],
  fields: FieldDefinition[]
): string[] {
  const suggestions: string[] = []

  for (const fieldId of missingFields) {
    const field = fields.find(f => f.id === fieldId)
    if (field) {
      // Generate question based on field type and keywords
      const question = `What is the ${field.label.toLowerCase()}?`
      suggestions.push(question)
    }
  }

  return suggestions.slice(0, 3) // Limit to 3 suggestions
}

/**
 * Main extraction function
 * Extract form data from conversation history using AI
 */
export async function extractFormData(
  formConfigId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<ExtractFormDataResponse> {
  try {
    // 1. Get form configuration
    const FormConfig = await getFormConfigModel()
    // @ts-expect-error - Mongoose type inference issue
    const formConfig = await FormConfig.findOne({ id: formConfigId }).lean()

    if (!formConfig) {
      throw new Error(`FormConfig not found: ${formConfigId}`)
    }

    // 2. Build extraction prompt
    const extractionPrompt = buildExtractionPrompt(formConfig)

    // 3. Call AI with conversation history + extraction prompt
    const systemMessage = { role: 'system' as const, content: extractionPrompt }
    const messages = [systemMessage, ...conversationHistory]

    // Convert messages to format expected by gemini service
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n')

    const aiResult = await chatWithExtraction(conversationText, false, [])

    // 4. Parse AI response
    const parsed = parseExtractionResponse(
      aiResult.response,
      formConfig.extraction.fields
    )

    // 5. Validate extracted data
    const validated = validateExtractedData(
      parsed.extractedFields || {},
      formConfig.extraction.fields
    )

    // 6. Calculate confidence scores
    const confidence = calculateConfidence(
      validated,
      parsed.confidence || {}
    )

    // 7. Find missing required fields
    const missing = findMissingFields(
      validated,
      formConfig.extraction.fields
    )

    // 8. Generate suggestions
    const suggestions = parsed.suggestions || generateSuggestions(
      missing,
      formConfig.extraction.fields
    )

    return {
      extractedFields: validated,
      confidence,
      missingFields: missing,
      suggestions,
      aiResponse: parsed.aiResponse || aiResult.response,
    }
  } catch (error) {
    logger.error('Form extraction error:', error)
    throw error
  }
}
