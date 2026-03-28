import { logger } from '@ezstart/logger/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/** Models to try in order — each has separate rate limits */
const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']

export async function ocrWithGemini(imageBuffer: Buffer): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    logger.warn('[OCR] Gemini API key not configured, skipping fallback')
    return null
  }

  const prompt = `Read ALL text from this Summoners War rune screenshot.
Return ONLY the text you see, line by line. Include:
- Rune name and slot number (e.g. "+12 Violent Rune (1)")
- Quality (Legend/Hero/Rare/Magic/Normal)
- Main stat (e.g. "ATK +118" or "SPD +42")
- All substats (e.g. "CRI Rate +12%", "SPD +10", "HP +693")
- Set bonus (e.g. "4 Set: Extra Turn +22%")
Do NOT add explanations, just the raw text.`

  const imageData = {
    inlineData: {
      mimeType: 'image/png' as const,
      data: imageBuffer.toString('base64'),
    },
  }

  for (const modelName of MODELS) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent([prompt, imageData])
      logger.info(`[OCR] Gemini ${modelName} succeeded`)
      return result.response.text()
    } catch (error: any) {
      if (error?.status === 429) {
        logger.warn(`[OCR] Gemini ${modelName} rate limited, trying next model...`)
        continue
      }
      logger.error(`[OCR] Gemini ${modelName} failed:`, error.message)
      return null
    }
  }

  logger.warn('[OCR] All Gemini models exhausted')
  return null
}
