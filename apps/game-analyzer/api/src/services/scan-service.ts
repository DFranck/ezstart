import { recognize, summonersWarParser, nikkeParser, analyzeRune } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import { ocrWithGemini } from './gemini-vision-service.js'
import type { GameType, RuneData, ScanResult } from '@game-analyzer/types'

type OcrResult = { text: string; confidence: number; regions: { text: string; bbox: { x: number; y: number; width: number; height: number }; confidence: number }[] }
type ParsedResult = { success: boolean; data?: any; errors?: string[] }

function mergeMultipleResults(
  results: Array<{ ocr: OcrResult; parse: ParsedResult }>
): { ocrResult: OcrResult; parseResult: ParsedResult } {
  // Filter to only successful parses
  const successful = results.filter(r => r.parse.success)

  if (successful.length === 0) {
    // All failed — return the first (main) result
    return { ocrResult: results[0].ocr, parseResult: results[0].parse }
  }
  if (successful.length === 1) {
    return { ocrResult: successful[0].ocr, parseResult: successful[0].parse }
  }

  // Start with the first successful result's substats as base
  const baseData = successful[0].parse.data as any
  const mergedSubs = [...(baseData.subStats || [])]

  // Merge substats from all other successful results
  for (let i = 1; i < successful.length; i++) {
    const otherSubs = (successful[i].parse.data as any).subStats || []
    for (const sub of otherSubs) {
      const existing = mergedSubs.find((s: any) => s.type === sub.type)
      if (!existing) {
        mergedSubs.push(sub)
      } else if (existing.value !== sub.value) {
        existing.value = Math.max(existing.value, sub.value)
      }
    }
  }

  // Cap à 4 substats max
  mergedSubs.splice(4)

  // Merge les autres champs — prendre la première valeur non-null
  const mergedData: Record<string, any> = {
    set: null, slot: null, level: null, grade: null,
    quality: null, mainStat: null, innateStat: null,
    subStats: mergedSubs,
  }
  for (const r of successful) {
    const d = r.parse.data as any
    if (!mergedData.set) mergedData.set = d.set
    if (!mergedData.slot) mergedData.slot = d.slot
    if (mergedData.level == null) mergedData.level = d.level
    if (!mergedData.grade) mergedData.grade = d.grade
    if (!mergedData.quality) mergedData.quality = d.quality
    if (!mergedData.mainStat) mergedData.mainStat = d.mainStat
    if (!mergedData.innateStat) mergedData.innateStat = d.innateStat
  }

  // Confidence: average of all + bonus for confirmed substats across sources
  const allSubArrays = successful.map(r => (r.parse.data as any).subStats || [])
  const baseSubs = allSubArrays[0] || []
  let confirmedCount = 0
  for (const ms of baseSubs) {
    const confirmations = allSubArrays.slice(1).filter(subs =>
      subs.some((s: any) => s.type === ms.type && s.value === ms.value)
    ).length
    confirmedCount += confirmations
  }
  const avgConfidence = results.reduce((sum, r) => sum + r.ocr.confidence, 0) / results.length
  const mergedConfidence = Math.round(avgConfidence + confirmedCount * 3)

  // rawText from the highest confidence source
  const bestSource = results.reduce((best, r) => r.ocr.confidence > best.ocr.confidence ? r : best)
  const mergedOcr: OcrResult = { text: bestSource.ocr.text, confidence: Math.min(mergedConfidence, 99), regions: [] }

  // Partial flag
  const partial = mergedSubs.length < 4 && (mergedData.level || 0) >= 12

  const logParts = results.map((r, i) => {
    const label = i === 0 ? 'main' : i === 1 ? 'alt' : 'full'
    const subs = r.parse.success ? ((r.parse.data as any).subStats || []).length : 0
    return `${label} ${subs} subs (${r.ocr.confidence}%)`
  })
  console.log(`[scan] Merge: ${logParts.join(' + ')} = ${mergedSubs.length} subs (${mergedConfidence}%)`)

  return {
    ocrResult: mergedOcr,
    parseResult: {
      success: true,
      data: { ...mergedData, partial },
      errors: [],
    }
  }
}

/**
 * Process an image through OCR, parse game-specific data, and store the result
 */
export async function scanImage(
  imageBuffer: Buffer,
  gameType: GameType,
  profile: string = 'mid',
  imageAltBuffer?: Buffer,
  imageFullBuffer?: Buffer
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

    // 2a. Merge with additional OCR sources (alt = raw crop, full = full window crop)
    const extraBuffers: { label: string; buffer: Buffer }[] = []
    if (imageAltBuffer) extraBuffers.push({ label: 'alt', buffer: imageAltBuffer })
    if (imageFullBuffer) extraBuffers.push({ label: 'full', buffer: imageFullBuffer })

    if (extraBuffers.length > 0) {
      try {
        const extraResults = await Promise.all(
          extraBuffers.map(async ({ label, buffer }) => {
            try {
              const ocr = await recognize(buffer, ocrConfig)
              const parse = parser.parse(ocr)
              return { ocr, parse }
            } catch (e) {
              console.error(`[scan] ${label} image OCR failed:`, e)
              return null
            }
          })
        )

        const allResults: Array<{ ocr: OcrResult; parse: ParsedResult }> = [
          { ocr: ocrResult, parse: parseResult },
          ...extraResults.filter((r): r is NonNullable<typeof r> => r !== null),
        ]

        if (allResults.length > 1) {
          const merged = mergeMultipleResults(allResults)
          ocrResult = merged.ocrResult
          parseResult = merged.parseResult
        }
      } catch (e) {
        console.error('[scan] Extra image OCR failed, using main:', e)
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
