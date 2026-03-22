import { recognize, summonersWarParser, nikkeParser } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import type { GameType, ScanResult } from '@game-analyzer/types'

/**
 * Process an image through OCR, parse game-specific data, and store the result
 */
export async function scanImage(
  imageBuffer: Buffer,
  gameType: GameType
): Promise<{ scanId: string; result: ScanResult }> {
  const Scan = await getScanModel()

  // Create scan record with pending status
  const scan = new Scan({
    gameType,
    imageUrl: `memory://${Date.now()}`, // In-memory buffer, no persistent URL yet
    status: 'processing',
  })
  await scan.save()

  const startTime = Date.now()

  try {
    // 1. Run OCR recognition
    const ocrResult = await recognize(imageBuffer)

    console.log('[scan] OCR text:', ocrResult.text.substring(0, 200))

    // 2. Parse with the appropriate game parser
    const parser = gameType === 'summoners-war' ? summonersWarParser : nikkeParser
    const parseResult = parser.parse(ocrResult)

    console.log('[scan] Parse result:', JSON.stringify(parseResult).substring(0, 200))

    const processingTimeMs = Date.now() - startTime

    // 3. Build result
    const result: ScanResult = {
      success: parseResult.success,
      data: parseResult.data as unknown as ScanResult['data'],
      rawText: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTimeMs,
    }

    // Update scan with result
    scan.status = parseResult.success ? 'completed' : 'failed'
    scan.result = result
    if (!parseResult.success && parseResult.errors?.length) {
      scan.error = parseResult.errors.join('; ')
    }
    await scan.save()

    return { scanId: scan._id.toString(), result }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown OCR error'

    scan.status = 'failed'
    scan.error = errorMessage
    await scan.save()

    throw new Error(`Scan failed: ${errorMessage}`)
  }
}
