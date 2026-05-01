import { GeminiProvider } from '@ezstart/ai-sdk/server'
import { logger } from '@ezstart/logger'

export interface BoundingBox {
  top: number
  left: number
  bottom: number
  right: number
}

export interface ValidationResult {
  isValid: boolean
  score: number
  roomsDetected: number
  feedback: string
  boundingBox: BoundingBox | null
}

const VALIDATION_PROMPT = `You are a floor plan validator. Analyze this image and determine:
1. Is this a floor plan or architectural drawing? (true/false)
2. Quality score (0-100): based on clarity, detail level, room visibility
3. Number of rooms detected
4. Feedback message for the user

If it's NOT a floor plan (e.g., photo of a dog, random image, text), score should be 0.
If it IS a floor plan but poor quality (blurry, too small, no rooms visible), score 10-40.
If it's a decent floor plan, score 50-80.
If it's a clear, detailed floor plan with rooms labeled, score 80-100.

Also detect the bounding box of the ENTIRE building/floor plan within the image.
Return the coordinates as percentages (0-100) of the image dimensions.
IMPORTANT: The bounding box MUST include ALL parts of the building — garage, terrace, porch, extensions, annexes, garden walls, ALL rooms without exception.
For irregular shapes (L-shaped, T-shaped, U-shaped), the bounding box must enclose the FULL footprint.
Leave a generous margin (~5-8%) around the building to ensure nothing is cut off.

Add to your JSON response:
"boundingBox": {
  "top": number,    // percentage from top (0-100)
  "left": number,   // percentage from left (0-100)
  "bottom": number, // percentage from top (0-100)
  "right": number   // percentage from left (0-100)
}

ALWAYS return a boundingBox, even if the building fills the entire image.
In that case, return { "top": 0, "left": 0, "bottom": 100, "right": 100 }.

Respond ONLY in JSON format:
{
  "isValid": true,
  "score": 75,
  "roomsDetected": 5,
  "feedback": "Clear floor plan with 5 rooms detected. Good resolution.",
  "boundingBox": { "top": 5, "left": 10, "bottom": 90, "right": 85 }
}`

/**
 * Shape returned by the Gemini vision JSON extraction.
 * The API is prompted to return these fields — validation happens below.
 */
interface RawValidationJson {
  isValid?: unknown
  score?: unknown
  roomsDetected?: unknown
  feedback?: unknown
  boundingBox?: {
    top?: unknown
    left?: unknown
    bottom?: unknown
    right?: unknown
  }
}

/**
 * Validate a floor plan image using the ai-sdk GeminiProvider (vision).
 * Runs server-side (Next.js API route — see `/api/validate/route.ts`).
 */
export async function validatePlanImage(imageData: string): Promise<ValidationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Extract base64 data and mime type from data URL
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid image data URL format')
  }

  const mimeType = match[1] as string
  const base64Data = match[2] as string

  const provider = new GeminiProvider({
    apiKey,
    model: 'gemini-2.5-flash',
  })

  try {
    const result = await provider.sendMessage(VALIDATION_PROMPT, {
      images: [{ data: base64Data, mimeType }],
      temperature: 0.3,
      extractJson: true,
    })

    const parsed = (result.extractedData ?? {}) as RawValidationJson

    logger.info(
      `[validate.service] Plan validated: score=${String(parsed.score)}, rooms=${String(parsed.roomsDetected)}`
    )

    // Parse bounding box if present and valid
    let boundingBox: BoundingBox | null = null
    if (parsed.boundingBox && typeof parsed.boundingBox === 'object') {
      const bb = parsed.boundingBox
      if (
        typeof bb.top === 'number' &&
        typeof bb.left === 'number' &&
        typeof bb.bottom === 'number' &&
        typeof bb.right === 'number' &&
        bb.bottom > bb.top &&
        bb.right > bb.left
      ) {
        boundingBox = {
          top: Math.max(0, Math.min(100, bb.top)),
          left: Math.max(0, Math.min(100, bb.left)),
          bottom: Math.max(0, Math.min(100, bb.bottom)),
          right: Math.max(0, Math.min(100, bb.right)),
        }
      }
    }

    return {
      isValid: Boolean(parsed.isValid),
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      roomsDetected: Math.max(0, Number(parsed.roomsDetected) || 0),
      feedback: String(parsed.feedback || 'No feedback available'),
      boundingBox,
    }
  } catch (err) {
    logger.error(
      '[validate.service] Gemini API error:',
      err instanceof Error ? err.message : String(err)
    )
    throw new Error('AI validation failed. Please try again.')
  }
}
