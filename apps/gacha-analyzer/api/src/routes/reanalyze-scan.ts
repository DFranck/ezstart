/**
 * POST /api/scans/:id/reanalyze — Re-analyze an existing scan with current parser/analyzer
 */

import { Router } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'
import { summonersWarParser } from '../parsers/summoners-war.js'
import { analyzeRune } from '../analyzers/rune-efficiency.js'
import type { RuneData, ScanResult } from '@game-analyzer/types'

const router: any = Router()

router.post('/:id/reanalyze', async (req: any, res: any) => {
  try {
    const Scan = await getScanModel()
    const scan = await Scan.findById(req.params.id)

    if (!scan) {
      return res.status(404).json({ success: false, error: 'Scan not found' })
    }

    if (!scan.result?.rawText) {
      return res.status(400).json({ success: false, error: 'Scan has no raw text to re-analyze' })
    }

    const profile = (req.query.profile as string) || 'mid'
    const startTime = Date.now()

    // Re-parse the raw text with the current parser
    const parseResult = summonersWarParser.parse({
      text: scan.result.rawText,
      confidence: scan.result.confidence,
      regions: [],
    })

    // Re-analyze if parsing succeeded
    let analysis: ScanResult['analysis'] = undefined
    if (parseResult.success && parseResult.data && 'set' in parseResult.data) {
      try {
        analysis = analyzeRune(parseResult.data as unknown as RuneData, profile as any) as unknown as ScanResult['analysis']
      } catch (e) {
        console.error('[reanalyze] Analysis failed:', e)
      }
    }

    const processingTimeMs = Date.now() - startTime

    // Update scan result in DB
    scan.result.data = parseResult.data as any
    scan.result.analysis = analysis as any
    scan.result.processingTimeMs = processingTimeMs
    scan.result.success = parseResult.success
    scan.status = parseResult.success ? 'completed' : 'failed'
    await scan.save()

    // Map _id → id for frontend compatibility
    const mapped = { ...(scan.toObject() as any), id: (scan as any)._id?.toString(), _id: undefined }

    res.json({ success: true, data: mapped })
  } catch (error) {
    console.error('[reanalyze-scan] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to re-analyze scan',
    })
  }
})

export default router
