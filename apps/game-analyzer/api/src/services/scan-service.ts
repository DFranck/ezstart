import { recognize, summonersWarParser, nikkeParser, analyzeRune } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import { ocrWithGemini } from './gemini-vision-service.js'
import type { GameType, RuneData, ScanResult } from '@game-analyzer/types'

/**
 * Process an image through OCR, parse game-specific data, and store the result
 */
export async function scanImage(
  imageBuffer: Buffer,
  gameType: GameType,
  profile: string = 'mid',
  imageAltBuffer?: Buffer
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
    let ocrResult = await recognize(imageBuffer, ocrConfig)

    // 2. Parse with the appropriate game parser
    const parser = gameType === 'summoners-war' ? summonersWarParser : nikkeParser
    let parseResult = parser.parse(ocrResult)

    // 2a. Compare with alt image (raw crop without preprocessing) if provided
    if (imageAltBuffer) {
      try {
        const altOcrResult = await recognize(imageAltBuffer, ocrConfig)
        const altParseResult = parser.parse(altOcrResult)

        const mainSubCount = Array.isArray(parseResult.data?.subStats) ? parseResult.data.subStats.length : 0
        const altSubCount = Array.isArray(altParseResult.data?.subStats) ? altParseResult.data.subStats.length : 0

        // Pick alt if it found more substats, or better confidence with successful parse
        if (altSubCount > mainSubCount ||
            (altOcrResult.confidence > ocrResult.confidence && altParseResult.success && altSubCount >= mainSubCount)) {
          console.log(`[scan] Alt image better: ${altSubCount} substats (vs ${mainSubCount}), confidence ${altOcrResult.confidence} (vs ${ocrResult.confidence})`)
          ocrResult = altOcrResult
          parseResult = altParseResult
        }
      } catch (e) {
        console.error('[scan] Alt image OCR failed, using main:', e)
      }
    }

    // 2b. Gemini Vision fallback if Tesseract result is weak
    // Trigger fallback when: low confidence, partial parse, or too few substats
    // partial=true means the parser found fewer substats than expected for the rune's quality/level
    const isPartial = parseResult.success && parseResult.data?.partial === true
    const hasFewerSubstats = (Array.isArray(parseResult.data?.subStats) ? parseResult.data.subStats.length : 0) < 3
    const needsFallback = ocrResult.confidence < 70 || isPartial || hasFewerSubstats

    if (needsFallback && gameType === 'summoners-war') {
      console.log('[scan] Low confidence or missing stats, trying Gemini Vision fallback...')
      const geminiText = await ocrWithGemini(imageBuffer)

      if (geminiText) {
        const geminiOcr = { text: geminiText, confidence: 95, regions: [] as { text: string; bbox: { x: number; y: number; width: number; height: number }; confidence: number }[] }
        const geminiParse = parser.parse(geminiOcr)

        const geminiSubCount = Array.isArray(geminiParse.data?.subStats) ? geminiParse.data.subStats.length : 0
        const currentSubCount = Array.isArray(parseResult.data?.subStats) ? parseResult.data.subStats.length : 0

        if (geminiSubCount > currentSubCount) {
          console.log('[scan] Gemini found more stats, using Gemini result')
          parseResult = geminiParse
          ocrResult.text = geminiText
          ocrResult.confidence = 95
        }
      }
    }

    // Mark result as unreliable when Gemini fallback was needed but unavailable,
    // and Tesseract result is weak (partial or fewer than 3 substats)
    const geminiWasNeeded = needsFallback && gameType === 'summoners-war'
    const geminiDidNotImprove = ocrResult.confidence < 70 || parseResult.data?.partial === true
    const tooFewSubstats = (Array.isArray(parseResult.data?.subStats) ? parseResult.data.subStats.length : 0) < 3
    const isUnreliable = geminiWasNeeded && geminiDidNotImprove && tooFewSubstats

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
    const partial = parseResult.data?.partial === true
    const result: ScanResult = {
      success: parseResult.success,
      data: parseResult.data as unknown as ScanResult['data'],
      rawText: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTimeMs,
      analysis,
      ...(partial ? { partial } : {}),
      ...(isUnreliable ? { unreliable: true } : {}),
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
