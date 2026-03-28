/**
 * POST /api/scans/:id/reanalyze — Re-analyze an existing scan with current parser/analyzer
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { z } from 'zod'
import { getScanModel } from '../models/scan.js'
import { summonersWarParser } from '../parsers/summoners-war.js'
import { analyzeRune } from '../analyzers/rune-efficiency.js'
import type { RuneData, ScanResult } from '@gacha-analyzer/types'

const router: any = Router()

const querySchema = z.object({
  profile: z.enum(['early', 'mid', 'late']).optional().default('mid'),
})

router.post('/:id/reanalyze', async (req: any, res: any) => {
  try {
    const validation = querySchema.safeParse(req.query)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid query parameters', validation.error.errors, 400)
    }

    const { profile } = validation.data

    const Scan = await getScanModel()
    const scan = await (Scan.findById as any)(req.params.id)

    if (!scan) {
      return sendError(res, 'Scan not found', 404)
    }

    if (!scan.result?.rawText) {
      return sendError(res, 'Scan has no raw text to re-analyze', 400)
    }
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
        analysis = analyzeRune(
          parseResult.data as unknown as RuneData,
          profile as any
        ) as unknown as ScanResult['analysis']
      } catch (e) {
        logger.error('[reanalyze] Analysis failed:', e)
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
    const mapped = {
      ...(scan.toObject() as any),
      id: (scan as any)._id?.toString(),
      _id: undefined,
    }

    return sendSuccess(res, mapped)
  } catch (error) {
    logger.error('[reanalyze-scan] Error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to re-analyze scan')
  }
})

export default router
