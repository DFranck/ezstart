import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function ocrWithGemini(imageBuffer: Buffer): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[OCR] Gemini API key not configured, skipping fallback')
    return null
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Read ALL text from this Summoners War rune screenshot.
Return ONLY the text you see, line by line. Include:
- Rune name and slot number (e.g. "+12 Violent Rune (1)")
- Quality (Legend/Hero/Rare/Magic/Normal)
- Main stat (e.g. "ATK +118" or "SPD +42")
- All substats (e.g. "CRI Rate +12%", "SPD +10", "HP +693")
- Set bonus (e.g. "4 Set: Extra Turn +22%")
Do NOT add explanations, just the raw text.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBuffer.toString('base64'),
        },
      },
    ])

    return result.response.text()
  } catch (error) {
    console.error('[OCR] Gemini Vision failed:', error)
    return null
  }
}
