import OpenAI from 'openai'
import fs from 'fs'
import type { ESGPayload } from '@green-pulse/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// System prompts
const SYSTEM_PROMPT_GENERAL = `You are GreenPulse.AI, an ESG advisor for SMEs in Southeast Asia.
Speak clearly and practically. When the user shares data, confirm assumptions, surface missing fields,
and prepare normalized JSON for ESG reporting.`

const SYSTEM_PROMPT_EXTRACTION = `You are a structured extractor. From the conversation text,
output ONLY valid JSON conforming to the ESG schema (company, sites, period, scopes, targets, evidence).
Do not include explanations. Fill missing values with null and list them in _missing.`

// Chat with extraction
export async function chatWithExtraction(message: string, extractEsg: boolean = false) {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: extractEsg ? SYSTEM_PROMPT_EXTRACTION : SYSTEM_PROMPT_GENERAL },
      { role: 'user', content: message },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: extractEsg ? 0.1 : 0.7,
      messages,
      response_format: extractEsg ? { type: 'json_object' } : undefined,
    })

    const content = response.choices[0]?.message?.content || ''

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
    console.error('OpenAI chat error:', error)
    throw new Error('Failed to process chat message')
  }
}

// Extract ESG payload from text
export async function extractEsgPayload(text: string): Promise<ESGPayload> {
  const schema = {
    type: 'object',
    properties: {
      company: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          country: { type: 'string' },
          sector: { type: 'string' },
        },
        required: ['name', 'country', 'sector'],
      },
      sites: { type: 'array' },
      period: { type: 'string' },
      scopes: {
        type: 'object',
        properties: {
          scope1: { type: 'array' },
          scope2: { type: 'array' },
          scope3: { type: 'array' },
        },
      },
      targets: { type: 'object' },
      evidence: { type: 'object' },
      _missing: { type: 'array' },
    },
    required: ['company', 'scopes', 'period'],
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT_EXTRACTION,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0]?.message?.content || '{}') as ESGPayload
}

// Speech to Text
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
    })
    return transcription.text
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error('Failed to transcribe audio')
  }
}

// Vision - Extract equipment attributes
export async function readImage(imageUrlOrPath: string): Promise<any> {
  try {
    let imageUrl = imageUrlOrPath

    // If it's a file path, convert to base64
    if (!imageUrlOrPath.startsWith('http')) {
      const imageBuffer = fs.readFileSync(imageUrlOrPath)
      const base64 = imageBuffer.toString('base64')
      imageUrl = `data:image/jpeg;base64,${base64}`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract equipment attributes and meter readings as JSON.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract and return JSON with: asset_type, brand, model, kW_rating, serial_number, reading_value, reading_unit, year_if_visible',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Vision processing error:', error)
    throw new Error('Failed to process image')
  }
}

// Validate ESG data
export async function validateEsgData(payload: ESGPayload): Promise<{ ok: boolean; errors?: string[] }> {
  const validationPrompt = `Validate this ESG data JSON against business rules:
- All numbers must be >= 0
- Period format must be YYYY, YYYY-Q#, or YYYY-MM
- Scope2 items must have site_id
- Company country must be 2-letter code
Return {"ok": true} or {"ok": false, "errors": [...]}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You are a data validator. Return only JSON.',
        },
        {
          role: 'user',
          content: `${validationPrompt}\n\nData: ${JSON.stringify(payload)}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    return JSON.parse(response.choices[0]?.message?.content || '{"ok": false, "errors": ["Validation failed"]}')
  } catch (error) {
    console.error('Validation error:', error)
    return { ok: false, errors: ['Validation service error'] }
  }
}