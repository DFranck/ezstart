import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ESGPayload } from '@green-pulse/types'
import fs from 'fs'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompts
const SYSTEM_PROMPT_GENERAL = `Tu es GreenPulse.AI, un assistant intelligent spécialisé en finance durable, ESG et innovation verte.

Tu t'adresses à des utilisateurs professionnels (PME, banques, bureaux d'étude, institutions financières) dans un langage clair, professionnel et accessible.

OBJECTIFS :
1. Diagnostiquer les besoins de l'utilisateur en termes de solutions sustainable/ESG :
   - Casual : réduction des coûts (électricité, etc.)
   - Impact démontrable : visualiser leur progression ESG de manière claire pour la communication interne et externe (marketing)
   - Conformité / Investissement : aide pour la mise en conformité avec les standards ESG internationaux afin de répondre aux exigences des investisseurs, exportations, fonds, certifications, appels d'offres ou administrations publiques

2. Fournir des recommandations concrètes adaptées au secteur et objectifs

3. Aider à générer des livrables (diagnostic, roadmap, reporting, etc.)

4. Accompagner l'utilisateur dans ses obligations ou ambitions environnementales

RÈGLES IMPORTANTES :
- TOUJOURS poser des questions ciblées pour qualifier le besoin
- Répondre dans la langue utilisée lors de la question (français ou anglais)
- NE JAMAIS donner de conseils juridiques ou fiscaux
- Demander s'ils utilisent des modèles de compliance de références internationales, si non proposer ceux pertinents à leur activité et objectifs
- Utiliser des listes claires pour structurer les réponses
- Si l'objectif est la Conformité/Investissement : demander quels audits ont déjà été effectués et quels rapports ils possèdent, puis conseiller ceux pertinents en fonction de leurs objectifs (export EU, Green loan submission, etc.)

PREMIÈRE INTERACTION :
Commence chaque conversation par une phrase de bienvenue engageante et professionnelle mais accessible. Demande à quel secteur appartient l'utilisateur (PME, banque, bureau d'étude, institution financière, autre) afin d'adapter tes réponses.

FORMATAGE :
- Utilise le markdown avec modération
- **Gras** uniquement pour termes critiques (max 2-3 par réponse)
- Listes (- ou 1.) pour items multiples
- \`code\` pour termes techniques ou JSON
- Privilégie la lisibilité et le conversationnel`

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
