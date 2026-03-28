/**
 * GET /api/scans — List scan history
 */

import { Router } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

// GET /scans — Get all scans (most recent first)
router.get('/', async (req: any, res: any) => {
  try {
    const Scan = await getScanModel()

    const { gameType, status, limit = '50', offset = '0' } = req.query

    const filter: Record<string, string> = {}
    if (gameType) filter.gameType = gameType
    if (status) filter.status = status

    const scans = await Scan.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
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
        limit: Number(limit),
        offset: Number(offset),
      },
    })
  } catch (error) {
    console.error('[get-scans] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scans',
    })
  }
})

export default router
