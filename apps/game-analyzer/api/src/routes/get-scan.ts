/**
 * GET /api/scans/:id — Get scan detail
 */

import { Router } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

// GET /scans/:id — Get a single scan by ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const Scan = await getScanModel()

    const scan = await Scan.findById(req.params.id).lean().exec()

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
      })
    }

    res.json({
      success: true,
      data: scan,
    })
  } catch (error) {
    console.error('[get-scan] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scan',
    })
  }
})

export default router
