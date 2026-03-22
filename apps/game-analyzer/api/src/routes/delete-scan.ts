/**
 * DELETE /api/scans/:id — Delete a scan
 */

import { Router } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

// DELETE /scans/:id — Delete a scan by ID
router.delete('/:id', async (req: any, res: any) => {
  try {
    const Scan = await getScanModel()

    const scan = await Scan.findByIdAndDelete(req.params.id).exec()

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
      })
    }

    res.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    console.error('[delete-scan] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete scan',
    })
  }
})

export default router
