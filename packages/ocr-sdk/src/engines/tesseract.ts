/**
 * Tesseract.js OCR Engine
 *
 * Wrapper around tesseract.js for text recognition from images
 */

import Tesseract from 'tesseract.js'
import type { OcrResult, OcrRegion, OcrEngineConfig } from '../types.js'

const DEFAULT_LANGUAGE = 'eng'

/**
 * Recognize text from an image buffer using Tesseract.js
 */
export async function recognize(
  imageBuffer: Buffer,
  config?: OcrEngineConfig
): Promise<OcrResult> {
  const language = config?.language ?? DEFAULT_LANGUAGE

  const { data } = await Tesseract.recognize(imageBuffer, language, {
    logger: () => {}, // silent
  })

  const regions: OcrRegion[] = (data.words ?? []).map((word) => ({
    text: word.text,
    bbox: {
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
    },
    confidence: word.confidence,
  }))

  return {
    text: data.text,
    confidence: data.confidence,
    regions,
  }
}
