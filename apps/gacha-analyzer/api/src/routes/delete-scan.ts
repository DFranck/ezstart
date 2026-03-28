/**
 * DELETE /api/scans/:id — Delete a scan
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

// DELETE /scans/:id — Delete a scan by ID
router.delete('/:id', async (req: any, res: any) => {
  try {
    const Scan = await getScanModel()

    const scan = await Scan.findByIdAndDelete(req.params.id).exec()

    if (!scan) {
      return sendError(res, 'Scan not found', 404)
    }

    return sendSuccess(res, { deleted: true })
  } catch (error) {
    logger.error('[delete-scan] Error:', error)
    return sendError(res, 'Failed to delete scan')
  }
})

export default router
