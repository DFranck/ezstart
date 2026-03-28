/**
 * GET /api/scans/:id — Get scan detail
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

// GET /scans/:id — Get a single scan by ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const Scan = await getScanModel()

    const scan = await (Scan.findById as any)(req.params.id).lean().exec()

    if (!scan) {
      return sendError(res, 'Scan not found', 404)
    }

    // Map _id → id for frontend compatibility
    const mapped = { ...(scan as any), id: (scan as any)._id?.toString(), _id: undefined }

    return sendSuccess(res, mapped)
  } catch (error) {
    logger.error('[get-scan] Error:', error)
    return sendError(res, 'Failed to fetch scan')
  }
})

export default router
