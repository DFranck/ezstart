/**
 * POST /api/rune/calculate — Playground endpoint: analyse a rune without DB write
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/api-core'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { analyzeRune, classifyRuneMarker } from '../analyzers/rune-efficiency.js'
import type { RuneData } from '@gacha-analyzer/types'

const router: ExpressRouter = Router()

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const RuneStatSchema = z.object({
  type: z.enum(['hp', 'hp%', 'atk', 'atk%', 'def', 'def%', 'spd', 'cr', 'cd', 'res', 'acc']),
  value: z.number().min(0),
})

const CalculateRuneBodySchema = z.object({
  slot: z.number().int().min(1).max(6),
  set: z.string().min(1),
  grade: z.number().int().min(1).max(6).optional().default(6),
  quality: z.enum(['normal', 'magic', 'rare', 'hero', 'legend']).optional().default('legend'),
  level: z.number().int().min(0).max(15),
  isAncient: z.boolean().optional().default(false),
  mainStat: RuneStatSchema,
  substats: z.array(RuneStatSchema).max(4),
  innateStat: RuneStatSchema.optional(),
  profile: z.enum(['early', 'mid', 'late']).optional().default('mid'),
})

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/**
 * POST /api/rune/calculate
 *
 * Analyse a rune without persisting anything. Intended for the playground UI
 * so users can evaluate a rune before (or instead of) scanning it.
 *
 * Body: CalculateRuneBodySchema
 * Response: { analysis: RuneAnalysis, markerResult: ClassifyRuneMarkerResult }
 */
router.post('/', async (req, res) => {
  try {
    const validation = CalculateRuneBodySchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid rune data', validation.error.errors, 400)
    }

    const { profile, substats, innateStat, ...rest } = validation.data

    const runeData: RuneData = {
      ...rest,
      slot: rest.slot as RuneData['slot'],
      set: rest.set as RuneData['set'],
      subStats: substats,
      ...(innateStat ? { innateStat } : {}),
    }

    const analysis = analyzeRune(runeData, profile)
    const markerResult = classifyRuneMarker(runeData)

    return sendSuccess(res, { analysis, markerResult })
  } catch (error) {
    logger.error('[calculate-rune] Error:', error)
    return sendError(res, error instanceof Error ? error.message : 'Failed to calculate rune')
  }
})

export { router as calculateRuneRouter }
