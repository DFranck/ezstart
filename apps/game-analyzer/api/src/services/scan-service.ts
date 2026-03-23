import { recognize, summonersWarParser, nikkeParser, analyzeRune } from '@ezstart/ocr-sdk'
import { getScanModel } from '../models/scan.js'
import { ocrWithGemini } from './gemini-vision-service.js'
import { preprocessImage } from './image-preprocessing.js'
import type { GameType, RuneData, ScanResult, OcrSource, BenchRunResult } from '@game-analyzer/types'

type OcrResult = { text: string; confidence: number; regions: { text: string; bbox: { x: number; y: number; width: number; height: number }; confidence: number }[] }
type ParsedResult = { success: boolean; data?: any; errors?: string[] }

// --- Parse a single stat line like "HP +15%" or "ATK +120" ---
function parseStatLine(text: string): { type: string; value: number } | null {
  // Match patterns: "HP +15%", "CRI Rate +6%", "ATK +20", "DEF +18", "SPD +5"
  const match = text.match(/([A-Za-z\s%]+?)\s*\+\s*(\d+)(%?)/)
  if (!match) return null
  return {
    type: match[1]!.trim(),
    value: parseInt(match[2]!, 10),
  }
}

// --- Bench presets (server-side preprocessing with sharp) ---

const BENCH_PRESETS = [
  { name: 'raw', options: {} },
  { name: 'upscale-2x', options: { scale: 2 } },
  { name: 'upscale-3x', options: { scale: 3 } },
  { name: 'grayscale', options: { grayscale: true } },
  { name: 'gray+up2x', options: { grayscale: true, scale: 2 } },
  { name: 'contrast', options: { contrast: 1.5 } },
  { name: 'binarize', options: { binarize: true, threshold: 128 } },
  { name: 'up2x+contrast', options: { scale: 2, contrast: 1.3 } },
] as const

// --- Majority vote merge for bench results ---

function mergeBenchResults(
  results: Array<{ ocr: OcrResult; parse: ParsedResult }>
): { ocrResult: OcrResult; parseResult: ParsedResult } {
  const successful = results.filter(r => r.parse.success)

  if (successful.length === 0) {
    return { ocrResult: results[0]!.ocr, parseResult: results[0]!.parse }
  }
  if (successful.length === 1) {
    return { ocrResult: successful[0]!.ocr, parseResult: successful[0]!.parse }
  }

  // Collect all substats across all successful results
  // For each stat type, use majority vote on the value
  const statVotes = new Map<string, Map<number, number>>() // type -> value -> count

  for (const r of successful) {
    const subs = (r.parse.data as any).subStats || []
    for (const sub of subs) {
      if (!statVotes.has(sub.type)) {
        statVotes.set(sub.type, new Map())
      }
      const valueMap = statVotes.get(sub.type)!
      valueMap.set(sub.value, (valueMap.get(sub.value) || 0) + 1)
    }
  }

  // Build merged substats using majority vote
  const mergedSubs: Array<{ type: string; value: number }> = []
  for (const [statType, valueMap] of statVotes) {
    // Pick the value with the most votes
    let bestValue = 0
    let bestCount = 0
    for (const [value, count] of valueMap) {
      if (count > bestCount || (count === bestCount && value > bestValue)) {
        bestValue = value
        bestCount = count
      }
    }
    mergedSubs.push({ type: statType, value: bestValue })
  }

  // Cap at 4 substats max — sort by vote count (most confirmed first)
  mergedSubs.sort((a, b) => {
    const aVotes = statVotes.get(a.type)?.get(a.value) || 0
    const bVotes = statVotes.get(b.type)?.get(b.value) || 0
    return bVotes - aVotes
  })
  mergedSubs.splice(4)

  // Merge other fields — take first non-null value
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

  // Confidence: max confidence among results that found the most substats
  const maxSubs = Math.max(...successful.map(r => ((r.parse.data as any).subStats || []).length))
  const bestResults = successful.filter(r => ((r.parse.data as any).subStats || []).length === maxSubs)
  const maxConfidence = Math.max(...bestResults.map(r => r.ocr.confidence))

  // Bonus for cross-confirmation
  let confirmedCount = 0
  for (const sub of mergedSubs) {
    const votes = statVotes.get(sub.type)?.get(sub.value) || 0
    if (votes >= 3) confirmedCount++
  }
  const mergedConfidence = Math.min(Math.round(maxConfidence + confirmedCount * 2), 99)

  // rawText from the highest confidence source
  const bestSource = results.reduce((best, r) => r.ocr.confidence > best.ocr.confidence ? r : best)
  const mergedOcr: OcrResult = { text: bestSource.ocr.text, confidence: mergedConfidence, regions: [] }

  // Partial flag
  const partial = mergedSubs.length < 4 && (mergedData.level || 0) >= 12

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
  imageFullBuffer?: Buffer,
  benchMode: boolean = false,
  presets?: string[],
  zoneBuffers?: Record<string, Buffer>
): Promise<{ scanId: string; result: ScanResult }> {
  const Scan = await getScanModel()

  // Create scan record with pending status
  const scan = new Scan({
    gameType,
    imageUrl: `memory://${Date.now()}`,
    status: 'processing',
  })
  await scan.save()

  const startTime = Date.now()

  try {
    const ocrConfig = gameType === 'summoners-war'
      ? {
          whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-%():. *',
          psm: '6',
        }
      : undefined
    const parser = gameType === 'summoners-war' ? summonersWarParser : nikkeParser

    let ocrResult: OcrResult
    let parseResult: ParsedResult
    let benchResults: BenchRunResult[] | undefined
    const ocrSources: OcrSource[] = []

    if (benchMode) {
      // --- BENCH MODE: 3 sources x N presets ---
      const images: Array<{ name: string; buffer: Buffer }> = [
        { name: 'zoom-preprocessed', buffer: imageBuffer },
      ]
      if (imageAltBuffer) images.push({ name: 'zoom-raw', buffer: imageAltBuffer })
      if (imageFullBuffer) images.push({ name: 'full-crop', buffer: imageFullBuffer })

      // Filter presets if specific ones requested (prod scan with saved presets)
      const activePresets = presets && presets.length > 0
        ? BENCH_PRESETS.filter(p => presets.includes(p.name))
        : BENCH_PRESETS

      const allRuns: Array<{
        source: string
        preset: string
        ocr: OcrResult
        parse: ParsedResult
        confidence: number
        subsCount: number
      }> = []

      // Run all image x preset combinations in parallel
      await Promise.all(
        images.flatMap(img =>
          activePresets.map(async preset => {
            try {
              const hasPreprocessing = Object.keys(preset.options).length > 0
              const processed = hasPreprocessing
                ? await preprocessImage(img.buffer, preset.options)
                : img.buffer
              const ocr = await recognize(processed, ocrConfig)
              const parse = parser.parse(ocr)
              allRuns.push({
                source: img.name,
                preset: preset.name,
                ocr,
                parse,
                confidence: Math.round(ocr.confidence),
                subsCount: parse.success ? ((parse.data as any)?.subStats || []).length : 0,
              })
            } catch (_e) {
              // Skip failed preset/source combinations
            }
          })
        )
      )

      // Sort by substats found then confidence
      allRuns.sort((a, b) => b.subsCount - a.subsCount || b.confidence - a.confidence)

      // Log bench results
      console.log(`[bench] ${allRuns.length} OCR runs:`)
      for (const r of allRuns) {
        console.log(`  ${r.source} + ${r.preset}: ${r.subsCount} subs, ${r.confidence}% conf`)
      }

      // Build benchResults for storage
      benchResults = allRuns.map(r => ({
        source: r.source,
        preset: r.preset,
        confidence: r.confidence,
        subsCount: r.subsCount,
        rawText: r.ocr.text,
        success: r.parse.success,
      }))

      // Build ocrSources (aggregate per source — best preset per source)
      const sourceGroups = new Map<string, typeof allRuns>()
      for (const r of allRuns) {
        if (!sourceGroups.has(r.source)) sourceGroups.set(r.source, [])
        sourceGroups.get(r.source)!.push(r)
      }
      for (const [name, runs] of sourceGroups) {
        const best = runs[0]! // already sorted by subsCount/confidence
        ocrSources.push({
          name,
          confidence: best.confidence,
          rawText: best.ocr.text,
          subsFound: best.subsCount,
          success: best.parse.success,
        })
      }

      // Merge ALL results using majority vote
      if (allRuns.length > 0) {
        const merged = mergeBenchResults(
          allRuns.map(r => ({ ocr: r.ocr, parse: r.parse }))
        )
        ocrResult = merged.ocrResult
        parseResult = merged.parseResult
      } else {
        ocrResult = { text: '', confidence: 0, regions: [] }
        parseResult = { success: false, errors: ['All OCR runs failed'] }
      }
    } else if (presets && presets.length > 0) {
      // --- PROD MODE with saved presets: test only specified presets ---
      const images: Array<{ name: string; buffer: Buffer }> = [
        { name: 'zoom-preprocessed', buffer: imageBuffer },
      ]
      if (imageAltBuffer) images.push({ name: 'zoom-raw', buffer: imageAltBuffer })
      if (imageFullBuffer) images.push({ name: 'full-crop', buffer: imageFullBuffer })

      const activePresets = BENCH_PRESETS.filter(p => presets.includes(p.name))
      if (activePresets.length === 0) activePresets.push(BENCH_PRESETS[1]) // fallback to upscale-2x

      const allRuns: Array<{ ocr: OcrResult; parse: ParsedResult }> = []

      await Promise.all(
        images.flatMap(img =>
          activePresets.map(async preset => {
            try {
              const hasPreprocessing = Object.keys(preset.options).length > 0
              const processed = hasPreprocessing
                ? await preprocessImage(img.buffer, preset.options)
                : img.buffer
              const ocr = await recognize(processed, ocrConfig)
              const parse = parser.parse(ocr)
              allRuns.push({ ocr, parse })
              ocrSources.push({
                name: `${img.name}+${preset.name}`,
                confidence: Math.round(ocr.confidence),
                rawText: ocr.text,
                subsFound: parse.success ? ((parse.data as any)?.subStats || []).length : 0,
                success: parse.success,
              })
            } catch (_e) {
              // Skip failed combinations
            }
          })
        )
      )

      if (allRuns.length > 1) {
        const merged = mergeBenchResults(allRuns)
        ocrResult = merged.ocrResult
        parseResult = merged.parseResult
      } else if (allRuns.length === 1) {
        ocrResult = allRuns[0]!.ocr
        parseResult = allRuns[0]!.parse
      } else {
        ocrResult = { text: '', confidence: 0, regions: [] }
        parseResult = { success: false, errors: ['All OCR runs failed'] }
      }
    } else {
      // --- STANDARD MODE (no bench, no presets) ---
      ocrResult = await recognize(imageBuffer, ocrConfig)
      parseResult = parser.parse(ocrResult)

      ocrSources.push({
        name: 'zoom-preprocessed',
        confidence: ocrResult.confidence,
        rawText: ocrResult.text,
        subsFound: parseResult.success ? ((parseResult.data as any)?.subStats || []).length : 0,
        success: parseResult.success,
      })

      const sourceNames: Record<string, string> = { alt: 'zoom-raw', full: 'full-crop' }
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
                ocrSources.push({
                  name: sourceNames[label] || label,
                  confidence: ocr.confidence,
                  rawText: ocr.text,
                  subsFound: parse.success ? ((parse.data as any)?.subStats || []).length : 0,
                  success: parse.success,
                })
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
            const merged = mergeBenchResults(allResults)
            ocrResult = merged.ocrResult
            parseResult = merged.parseResult
          }
        } catch (e) {
          console.error('[scan] Extra image OCR failed, using main:', e)
        }
      }
    }

    // --- Zone-based OCR: 8 individual zones for precise extraction ---
    if (zoneBuffers && Object.keys(zoneBuffers).length > 0) {
      console.log(`[scan] Zone-based OCR (8 zones): ${Object.keys(zoneBuffers).join(', ')}`)

      const zoneResults = await Promise.all(
        Object.entries(zoneBuffers).map(async ([zoneName, buffer]) => {
          try {
            const processed = await preprocessImage(buffer, { scale: 2 })
            const ocr = await recognize(processed, ocrConfig)
            return { zoneName, ocr, text: ocr.text.trim(), confidence: ocr.confidence }
          } catch (e) {
            console.error(`[scan] Zone ${zoneName} OCR failed:`, e)
            return { zoneName, ocr: null, text: '', confidence: 0 }
          }
        })
      )

      // Build a map of zone results
      const zoneMap: Record<string, { text: string; confidence: number }> = {}
      let zoneConfidenceSum = 0
      let zoneConfidenceCount = 0

      for (const zr of zoneResults) {
        if (zr.ocr) {
          zoneMap[zr.zoneName] = { text: zr.text, confidence: zr.confidence }
          zoneConfidenceSum += zr.confidence
          zoneConfidenceCount++
          ocrSources.push({
            name: `zone-${zr.zoneName}`,
            confidence: Math.round(zr.confidence),
            rawText: zr.text,
            subsFound: 0,
            success: true,
          })
        }
      }

      if (zoneConfidenceCount > 0) {
        // Parse individual zones directly instead of relying on the full parser
        const zoneParsed: Record<string, any> = {}

        // setSlot → extract set name, slot number, level
        if (zoneMap.setSlot) {
          const text = zoneMap.setSlot.text
          // Match patterns like "Violent Rune (2)" or "Swift (4) +12"
          const setMatch = text.match(/([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(?:Rune)?\s*\((\d)\)/i)
          if (setMatch) {
            zoneParsed.set = setMatch[1]!.trim()
            zoneParsed.slot = parseInt(setMatch[2]!, 10)
          }
          const levelMatch = text.match(/\+(\d+)/)
          if (levelMatch) zoneParsed.level = parseInt(levelMatch[1]!, 10)
        }

        // mainStat → extract main stat type and value
        if (zoneMap.mainStat) {
          const text = zoneMap.mainStat.text
          // Match patterns like "CRI Dmg +80%" or "ATK +160" or "SPD +42"
          const statMatch = text.match(/([A-Za-z\s%]+?)\s*\+\s*(\d+%?)/)
          if (statMatch) {
            zoneParsed.mainStat = {
              type: statMatch[1]!.trim(),
              value: statMatch[2]!.includes('%') ? parseInt(statMatch[2]!, 10) : parseInt(statMatch[2]!, 10),
            }
          }
        }

        // quality → match Legend/Hero/Rare/Magic/Normal
        if (zoneMap.quality) {
          const text = zoneMap.quality.text.toLowerCase()
          const qualities = ['legend', 'hero', 'rare', 'magic', 'normal']
          for (const q of qualities) {
            if (text.includes(q)) {
              zoneParsed.quality = q
              break
            }
          }
        }

        // innate → single stat line
        if (zoneMap.innate) {
          const stat = parseStatLine(zoneMap.innate.text)
          if (stat) zoneParsed.innateStat = stat
        }

        // sub1-4 → each is a single stat line
        const subStats: Array<{ type: string; value: number }> = []
        for (const subName of ['sub1', 'sub2', 'sub3', 'sub4']) {
          if (zoneMap[subName]) {
            const stat = parseStatLine(zoneMap[subName]!.text)
            if (stat) subStats.push(stat)
          }
        }
        zoneParsed.subStats = subStats

        const combinedConfidence = Math.round(zoneConfidenceSum / zoneConfidenceCount)
        const combinedText = Object.entries(zoneMap).map(([k, v]) => `[${k}] ${v.text}`).join('\n')
        const zoneOcr: OcrResult = { text: combinedText, confidence: combinedConfidence, regions: [] }

        // Build zone-based parse result
        const zoneParseResult: ParsedResult = {
          success: subStats.length > 0 || !!zoneParsed.mainStat,
          data: {
            set: zoneParsed.set || null,
            slot: zoneParsed.slot || null,
            level: zoneParsed.level ?? null,
            grade: null,
            quality: zoneParsed.quality || null,
            mainStat: zoneParsed.mainStat || null,
            innateStat: zoneParsed.innateStat || null,
            subStats: zoneParsed.subStats,
          },
        }

        const zoneSubCount = subStats.length
        const currentSubCount = parseResult.success ? ((parseResult.data as any)?.subStats || []).length : 0

        console.log(`[scan] Zone individual parse: ${zoneSubCount} subs (innate: ${zoneParsed.innateStat ? 'yes' : 'no'}), current global: ${currentSubCount}`)

        // Zone-based parsing is PRIORITY when it found meaningful data.
        // The global parser mixes innate into substats — zones keep them separate.
        if (zoneParseResult.success) {
          // Fill missing fields from global parse result (grade, set, etc.)
          const zoneData = zoneParseResult.data as Record<string, any>
          const globalData = parseResult.success ? (parseResult.data as Record<string, any>) : null

          if (!zoneData.set && globalData?.set) zoneData.set = globalData.set
          if (!zoneData.slot && globalData?.slot) zoneData.slot = globalData.slot
          if (zoneData.level == null && globalData?.level != null) zoneData.level = globalData.level
          if (!zoneData.grade && globalData?.grade) zoneData.grade = globalData.grade
          if (!zoneData.quality && globalData?.quality) zoneData.quality = globalData.quality
          if (!zoneData.mainStat && globalData?.mainStat) zoneData.mainStat = globalData.mainStat

          ocrResult = zoneOcr
          parseResult = zoneParseResult
          console.log(`[scan] Using zone-individual result (${zoneSubCount} subs, innate separated, ${combinedConfidence}% conf)`)
        } else {
          console.log(`[scan] Zone parse failed, falling back to global result (${currentSubCount} subs)`)
        }
      }
    }

    // Gemini Vision fallback if Tesseract result is weak
    const isPartial = parseResult.success && parseResult.data?.partial === true
    const hasFewerSubstats = (Array.isArray(parseResult.data?.subStats) ? parseResult.data.subStats.length : 0) < 3
    const needsFallback = ocrResult.confidence < 70 || isPartial || hasFewerSubstats

    if (needsFallback && gameType === 'summoners-war') {
      console.log('[scan] Low confidence or missing stats, trying Gemini Vision fallback...')
      const geminiText = await ocrWithGemini(imageBuffer)

      if (geminiText) {
        const geminiOcr = { text: geminiText, confidence: 95, regions: [] as OcrResult['regions'] }
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

    // Mark result as unreliable when Gemini fallback was needed but unavailable
    const geminiWasNeeded = needsFallback && gameType === 'summoners-war'
    const geminiDidNotImprove = ocrResult.confidence < 70 || parseResult.data?.partial === true
    const tooFewSubstats = (Array.isArray(parseResult.data?.subStats) ? parseResult.data.subStats.length : 0) < 3
    const isUnreliable = geminiWasNeeded && geminiDidNotImprove && tooFewSubstats

    const processingTimeMs = Date.now() - startTime

    // Analyze rune if parsing succeeded (SW only for now)
    let analysis: ScanResult['analysis'] = undefined
    if (parseResult.success && gameType === 'summoners-war' && parseResult.data && 'set' in parseResult.data) {
      try {
        analysis = analyzeRune(parseResult.data as unknown as RuneData, profile as any) as unknown as ScanResult['analysis']
      } catch (e) {
        console.error('[scan] Analysis failed:', e)
      }
    }

    // Build result
    const partial = parseResult.data?.partial === true
    const result: ScanResult = {
      success: parseResult.success,
      data: parseResult.data as unknown as ScanResult['data'],
      rawText: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTimeMs,
      analysis,
      ocrSources,
      ...(partial ? { partial } : {}),
      ...(isUnreliable ? { unreliable: true } : {}),
      ...(benchResults ? { benchResults } : {}),
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
