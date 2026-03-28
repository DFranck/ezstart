/**
 * POST /api/scans/:id/feedback — Submit feedback on a scan
 */

import { Router } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

router.post('/:id/feedback', async (req: any, res: any) => {
  try {
    const { opinion, comment } = req.body

    if (!opinion || !['agree', 'disagree'].includes(opinion)) {
      return res.status(400).json({
        success: false,
        error: 'opinion must be agree or disagree',
      })
    }

    const Scan = await getScanModel()

    const scan = await Scan.findByIdAndUpdate(
      req.params.id,
      { feedback: { opinion, comment: comment || '', createdAt: new Date() } },
      { new: true }
    ).lean()

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
      })
    }

    res.json({
      success: true,
      data: { ...(scan as any), id: (scan as any)._id?.toString(), _id: undefined },
    })
  } catch (error) {
    console.error('[feedback-scan] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    })
  }
})

export default router
