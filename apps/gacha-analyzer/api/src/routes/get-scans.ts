/**
 * GET /api/scans — List scan history
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

const querySchema = z.object({
  gameType: z.enum(['summoners-war', 'nikke']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /scans — Get all scans (most recent first)
router.get('/', async (req: any, res: any) => {
  try {
    const validation = querySchema.safeParse(req.query)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.errors,
      })
    }

    const { gameType, status, limit, offset } = validation.data

    const Scan = await getScanModel()

    const filter: Record<string, string> = {}
    if (gameType) filter.gameType = gameType
    if (status) filter.status = status

    const scans = await Scan.find(filter)
      .select('-thumbnail')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec()

    const total = await Scan.countDocuments(filter).exec()

    // Map _id → id for frontend compatibility
    const mapped = scans.map((s: any) => ({ ...s, id: s._id?.toString(), _id: undefined }))

    res.json({
      success: true,
      data: mapped,
      meta: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    logger.error('[get-scans] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scans',
    })
  }
})

export default router
