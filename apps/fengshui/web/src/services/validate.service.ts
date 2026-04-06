import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@ezstart/logger'

export interface ValidationResult {
  isValid: boolean
  score: number
  roomsDetected: number
  feedback: string
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

Respond ONLY in JSON format:
{
  "isValid": true,
  "score": 75,
  "roomsDetected": 5,
  "feedback": "Clear floor plan with 5 rooms detected. Good resolution."
}`

/**
 * Validate a floor plan image using Google Gemini Vision.
 */
export async function validatePlanImage(
  imageData: string
): Promise<ValidationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  })

  // Extract base64 data and mime type from data URL
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid image data URL format')
  }

  const mimeType = match[1] as string
  const base64Data = match[2] as string

  try {
    const result = await model.generateContent([
      VALIDATION_PROMPT,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ])

    const text = result.response.text()
    const parsed = JSON.parse(text) as ValidationResult

    logger.info(
      `[validate.service] Plan validated: score=${parsed.score}, rooms=${parsed.roomsDetected}`
    )

    return {
      isValid: Boolean(parsed.isValid),
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      roomsDetected: Math.max(0, Number(parsed.roomsDetected) || 0),
      feedback: String(parsed.feedback || 'No feedback available'),
    }
  } catch (err) {
    logger.error(
      '[validate.service] Gemini API error:',
      err instanceof Error ? err.message : String(err)
    )
    throw new Error('AI validation failed. Please try again.')
  }
}
