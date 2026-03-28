/**
 * POST /api/bench — OCR bench route
 *
 * Receives an image, runs ALL OCR presets in parallel,
 * saves raw image + results to disk, returns comparison.
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { recognize } from '@ezstart/ocr-sdk'
import { summonersWarParser } from '../parsers/summoners-war.js'
import { upload } from '../middleware/upload.js'
import { preprocessImage, type PreprocessOptions } from '../services/image-preprocessing.js'

const router: any = Router()

// --- OCR presets to benchmark ---

interface OcrPreset {
  name: string
  config: PreprocessOptions
}

const OCR_PRESETS: OcrPreset[] = [
  { name: 'raw', config: {} },
  { name: 'upscale-2x', config: { scale: 2 } },
  { name: 'upscale-3x', config: { scale: 3 } },
  { name: 'grayscale', config: { grayscale: true } },
  { name: 'gray+upscale2x', config: { grayscale: true, scale: 2 } },
  { name: 'contrast1.5', config: { contrast: 1.5 } },
  { name: 'binarize', config: { binarize: true, threshold: 128 } },
  { name: 'upscale2x+gray', config: { scale: 2, grayscale: true } },
]

const benchBodySchema = z.object({
  gameType: z.enum(['summoners-war', 'nikke']).optional().default('summoners-war'),
})

// SW-specific OCR config (same as scan-service)
const SW_OCR_CONFIG = {
  whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-%():. *',
  psm: '6',
}

interface PresetResult {
  preset: string
  confidence: number
  rawText: string
  substatsFound: number
  success: boolean
  parseErrors: string[]
  processingTimeMs: number
}

/**
 * Run a single OCR preset against an image buffer
 */
async function runPreset(
  imageBuffer: Buffer,
  preset: OcrPreset,
  gameType: string
): Promise<PresetResult> {
  const start = Date.now()

  try {
    // 1. Preprocess
    const hasPreprocessing = Object.keys(preset.config).length > 0
    const processedBuffer = hasPreprocessing
      ? await preprocessImage(imageBuffer, preset.config)
      : imageBuffer

    // 2. OCR
    const ocrConfig = gameType === 'summoners-war' ? SW_OCR_CONFIG : undefined
    const ocrResult = await recognize(processedBuffer, ocrConfig)

    // 3. Parse
    const parser = summonersWarParser // Only SW for now
    const parseResult = parser.parse(ocrResult)

    const substats = Array.isArray(parseResult.data?.subStats)
      ? (parseResult.data.subStats as unknown[]).length
      : 0

    return {
      preset: preset.name,
      confidence: Math.round(ocrResult.confidence),
      rawText: ocrResult.text,
      substatsFound: substats,
      success: parseResult.success,
      parseErrors: parseResult.errors ?? [],
      processingTimeMs: Date.now() - start,
    }
  } catch (err) {
    return {
      preset: preset.name,
      confidence: 0,
      rawText: '',
      substatsFound: 0,
      success: false,
      parseErrors: [err instanceof Error ? err.message : 'Unknown error'],
      processingTimeMs: Date.now() - start,
    }
  }
}

/**
 * Save raw image and bench results to test-images/
 */
async function saveBenchData(
  imageBuffer: Buffer,
  benchId: string,
  results: PresetResult[]
) {
  const dir = join(process.cwd(), 'test-images')
  await mkdir(dir, { recursive: true })

  await Promise.all([
    writeFile(join(dir, `${benchId}-raw.png`), imageBuffer),
    writeFile(join(dir, `${benchId}-results.json`), JSON.stringify(results, null, 2)),
  ])
}

// POST /bench
router.post('/', upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Use field name "image".',
      })
    }

    const validation = benchBodySchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors,
      })
    }

    const { gameType } = validation.data
    const benchId = `scan-${Date.now()}`
    const imageBuffer = req.file.buffer as Buffer

    // Run all presets in parallel
    const results = await Promise.all(
      OCR_PRESETS.map((preset) => runPreset(imageBuffer, preset, gameType))
    )

    // Save to disk
    await saveBenchData(imageBuffer, benchId, results)

    // Find best preset (highest substats, then confidence as tiebreaker)
    const bestResult = [...results].sort((a, b) => {
      if (b.substatsFound !== a.substatsFound) return b.substatsFound - a.substatsFound
      return b.confidence - a.confidence
    })[0]

    // Get image dimensions via sharp metadata
    const { default: sharp } = await import('sharp')
    const meta = await sharp(imageBuffer).metadata()

    res.json({
      success: true,
      benchId,
      results: results.map(({ preset, confidence, substatsFound, success, processingTimeMs }) => ({
        preset,
        confidence,
        substats: substatsFound,
        success,
        processingTimeMs,
      })),
      bestPreset: bestResult?.preset ?? null,
      image: {
        width: meta.width ?? 0,
        height: meta.height ?? 0,
      },
    })
  } catch (error) {
    logger.error('[bench-ocr] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Bench failed',
    })
  }
})

export default router
