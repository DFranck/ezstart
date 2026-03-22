import { recognize } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import type { GameType, ScanResult } from '@game-analyzer/types'

/**
 * Process an image through OCR and store the result
 * For now, returns raw OCR text. Game-specific parsers will be added in Phase 4.
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
    // Run OCR recognition
    const ocrResult = await recognize(imageBuffer)

    const processingTimeMs = Date.now() - startTime

    const result: ScanResult = {
      success: true,
      data: {} as any, // Parsers will fill this in Phase 4
      rawText: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTimeMs,
    }

    // Update scan with result
    scan.status = 'completed'
    scan.result = result
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
