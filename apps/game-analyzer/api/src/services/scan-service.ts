import { recognize, summonersWarParser, nikkeParser, analyzeRune } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import { ocrWithGemini } from './gemini-vision-service.js'
import type { GameType, RuneData, ScanResult } from '@game-analyzer/types'

type OcrResult = { text: string; confidence: number; regions: { text: string; bbox: { x: number; y: number; width: number; height: number }; confidence: number }[] }
type ParsedResult = { success: boolean; data?: any; errors?: string[] }

function mergeOcrResults(
  mainOcr: OcrResult, mainParse: ParsedResult,
  altOcr: OcrResult, altParse: ParsedResult
): { ocrResult: OcrResult; parseResult: ParsedResult } {

  const mainData = mainParse.data as any
  const altData = altParse.data as any

  if (!mainParse.success && !altParse.success) {
    return { ocrResult: mainOcr, parseResult: mainParse }
  }
  if (!mainParse.success) return { ocrResult: altOcr, parseResult: altParse }
  if (!altParse.success) return { ocrResult: mainOcr, parseResult: mainParse }

  // Merge substats — union des deux, dédupliqué par type
  const mainSubs = mainData.subStats || []
  const altSubs = altData.subStats || []
  const mergedSubs = [...mainSubs]

  for (const altSub of altSubs) {
    const existing = mergedSubs.find((s: any) => s.type === altSub.type)
    if (!existing) {
      // Stat trouvée seulement par alt → l'ajouter
      mergedSubs.push(altSub)
    } else if (existing.value !== altSub.value) {
      // Même stat, valeurs différentes → garder la plus haute (erreurs OCR tendent vers le bas)
      existing.value = Math.max(existing.value, altSub.value)
    }
  }

  // Cap à 4 substats max
  mergedSubs.splice(4)

  // Merge les autres champs — prendre la valeur non-null du meilleur
  const mergedData = {
    set: mainData.set || altData.set,
    slot: mainData.slot || altData.slot,
    level: mainData.level ?? altData.level,
    grade: mainData.grade || altData.grade,
    quality: mainData.quality || altData.quality,
    mainStat: mainData.mainStat || altData.mainStat,
    innateStat: mainData.innateStat || altData.innateStat,
    subStats: mergedSubs,
  }

  // Calcul de la merged confidence
  const confirmedCount = mainSubs.filter((ms: any) =>
    altSubs.some((as: any) => as.type === ms.type && as.value === ms.value)
  ).length
  const mergedConfidence = Math.round(
    (mainOcr.confidence + altOcr.confidence) / 2 + confirmedCount * 3
  )

  // Combiner le rawText
  const mergedRawText = mainOcr.confidence >= altOcr.confidence ? mainOcr.text : altOcr.text

  const mergedOcr: OcrResult = { text: mergedRawText, confidence: Math.min(mergedConfidence, 99), regions: [] }

  // Partial flag — si le merge a moins de 4 subs pour une rune +12
  const expectedSubs = 4
  const partial = mergedSubs.length < expectedSubs && (mergedData.level || 0) >= 12

  console.log(`[scan] Merge: main ${mainSubs.length} subs (${mainOcr.confidence}%) + alt ${altSubs.length} subs (${altOcr.confidence}%) = ${mergedSubs.length} subs (${mergedConfidence}%)`)

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

    // 2a. Merge with alt image (raw crop without preprocessing) if provided
    if (imageAltBuffer) {
      try {
        const altOcrResult = await recognize(imageAltBuffer, ocrConfig)
        const altParseResult = parser.parse(altOcrResult)

        const merged = mergeOcrResults(ocrResult, parseResult, altOcrResult, altParseResult)
        ocrResult = merged.ocrResult
        parseResult = merged.parseResult
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
