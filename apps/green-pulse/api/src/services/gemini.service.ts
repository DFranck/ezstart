import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import type { ESGPayload } from '@green-pulse/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompts
const SYSTEM_PROMPT_GENERAL = `You are GreenPulse.AI, an ESG advisor for SMEs in Southeast Asia.
Speak clearly and practically. When the user shares data, confirm assumptions, surface missing fields,
and prepare normalized JSON for ESG reporting.

Formatting guidelines:
- Use markdown sparingly - only when truly needed for clarity
- Use **bold** only for critical terms or emphasis (max 2-3 per response)
- Use lists (- or 1.) for multiple items or steps
- Use \`code\` for technical terms, JSON keys, or values
- Avoid excessive italic or formatting - prioritize readability
- Keep responses conversational and easy to scan`

const SYSTEM_PROMPT_EXTRACTION = `You are a structured extractor. From the conversation text,
output ONLY valid JSON conforming to the ESG schema (company, sites, period, scopes, targets, evidence).
Do not include explanations. Fill missing values with null and list them in _missing.`

// Chat with extraction (with conversation history support)
export async function chatWithExtraction(
  message: string,
  extractEsg: boolean = false,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: extractEsg ? SYSTEM_PROMPT_EXTRACTION : SYSTEM_PROMPT_GENERAL,
      generationConfig: {
        temperature: extractEsg ? 0.1 : 0.7,
        responseMimeType: extractEsg ? 'application/json' : 'text/plain',
      },
    })

    let content: string

    // If conversation history exists, use chat mode for context
    if (conversationHistory && conversationHistory.length > 0) {
      // Convert conversation history to Gemini format
      const history = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      // Start chat with history
      const chat = model.startChat({ history })
      const result = await chat.sendMessage(message)
      content = result.response.text()
    } else {
      // No history, use single generateContent
      const result = await model.generateContent(message)
      content = result.response.text()
    }

    if (extractEsg) {
      try {
        return {
          response: 'Data extracted successfully',
          extractedData: JSON.parse(content) as ESGPayload,
        }
      } catch {
        return {
          response: 'Failed to parse extracted data',
          extractedData: null,
        }
      }
    }

    return {
      response: content,
      extractedData: null,
    }
  } catch (error) {
    console.error('Gemini chat error:', error)
    throw new Error('Failed to process chat message')
  }
}

// Extract ESG payload from text
export async function extractEsgPayload(text: string): Promise<ESGPayload> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT_EXTRACTION,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(text)
  const content = result.response.text()

  return JSON.parse(content || '{}') as ESGPayload
}

// Speech to Text
// NOTE: Gemini doesn't support audio transcription yet
// Keep using Whisper API or use AssemblyAI free tier (https://www.assemblyai.com/)
export async function transcribeAudio(filePath: string): Promise<string> {
  throw new Error(
    'Audio transcription not supported with Gemini. Use Whisper API or AssemblyAI instead.'
  )
}

// Vision - Extract equipment attributes
export async function readImage(imageUrlOrPath: string): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'Extract equipment attributes and meter readings as JSON.',
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    })

    let imagePart: { inlineData: { data: string; mimeType: string } }

    // If it's a file path, convert to base64
    if (!imageUrlOrPath.startsWith('http')) {
      const imageBuffer = fs.readFileSync(imageUrlOrPath)
      const base64 = imageBuffer.toString('base64')
      imagePart = {
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg',
        },
      }
    } else {
      // Gemini requires base64 for images, so we need to fetch and convert
      // For now, throw error for URLs - need to implement fetch + convert
      throw new Error('URL images not yet supported. Use file path instead.')
    }

    const prompt =
      'Extract and return JSON with: asset_type, brand, model, kW_rating, serial_number, reading_value, reading_unit, year_if_visible'

    const result = await model.generateContent([prompt, imagePart])
    const content = result.response.text()

    return JSON.parse(content || '{}')
  } catch (error) {
    console.error('Vision processing error:', error)
    throw new Error('Failed to process image')
  }
}

// Validate ESG data
export async function validateEsgData(
  payload: ESGPayload
): Promise<{ ok: boolean; errors?: string[] }> {
  const validationPrompt = `Validate this ESG data JSON against business rules:
- All numbers must be >= 0
- Period format must be YYYY, YYYY-Q#, or YYYY-MM
- Scope2 items must have site_id
- Company country must be 2-letter code
Return {"ok": true} or {"ok": false, "errors": [...]}`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a data validator. Return only JSON.',
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent(
      `${validationPrompt}\n\nData: ${JSON.stringify(payload)}`
    )
    const content = result.response.text()

    return JSON.parse(content || '{"ok": false, "errors": ["Validation failed"]}')
  } catch (error) {
    console.error('Validation error:', error)
    return { ok: false, errors: ['Validation service error'] }
  }
}
