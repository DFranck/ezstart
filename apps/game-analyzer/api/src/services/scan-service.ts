import { recognize, summonersWarParser, nikkeParser, analyzeRune } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import type { GameType, RuneData, ScanResult } from '@game-analyzer/types'

/**
 * Process an image through OCR, parse game-specific data, and store the result
 */
export async function scanImage(
  imageBuffer: Buffer,
  gameType: GameType,
  profile: string = 'mid'
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
    // 1. Run OCR recognition with game-specific config
    const ocrConfig = gameType === 'summoners-war'
      ? {
          whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-%():. *',
          psm: '6',
        }
      : undefined
    const ocrResult = await recognize(imageBuffer, ocrConfig)

    // 2. Parse with the appropriate game parser
    const parser = gameType === 'summoners-war' ? summonersWarParser : nikkeParser
    const parseResult = parser.parse(ocrResult)

    const processingTimeMs = Date.now() - startTime

    // 3. Analyze rune if parsing succeeded (SW only for now)
    let analysis: ScanResult['analysis'] = undefined
    if (parseResult.success && gameType === 'summoners-war' && parseResult.data && 'set' in parseResult.data) {
      try {
        analysis = analyzeRune(parseResult.data as unknown as RuneData, profile as any) as unknown as ScanResult['analysis']
      } catch (e) {
        // Don't fail the scan if analysis fails
        console.error('[scan] Analysis failed:', e)
      }
    }

    // 4. Build result
    const result: ScanResult = {
      success: parseResult.success,
      data: parseResult.data as unknown as ScanResult['data'],
      rawText: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTimeMs,
      analysis,
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
