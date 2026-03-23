/**
 * Tesseract.js OCR Engine
 *
 * Wrapper around tesseract.js for text recognition from images
 */

import Tesseract from 'tesseract.js'
import type { OcrResult, OcrRegion, OcrEngineConfig } from '../types.js'

const DEFAULT_LANGUAGE = 'eng'

/**
 * Build Tesseract worker parameters from engine config
 */
function buildParameters(config?: OcrEngineConfig): Partial<Tesseract.WorkerParams> {
  const params: Record<string, string> = {}

  if (config?.whitelist) {
    params.tessedit_char_whitelist = config.whitelist
  }
  if (config?.psm) {
    params.tessedit_pageseg_mode = config.psm
  }

  // Always preserve spaces between words for stat-line readability
  params.preserve_interword_spaces = '1'

  return params as Partial<Tesseract.WorkerParams>
}

/**
 * Recognize text from an image buffer using Tesseract.js
 */
export async function recognize(
  imageBuffer: Buffer,
  config?: OcrEngineConfig
): Promise<OcrResult> {
  const language = config?.language ?? DEFAULT_LANGUAGE
  const parameters = buildParameters(config)

  const worker = await Tesseract.createWorker(language)
  await worker.setParameters(parameters)

  const { data } = await worker.recognize(imageBuffer)
  await worker.terminate()

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
