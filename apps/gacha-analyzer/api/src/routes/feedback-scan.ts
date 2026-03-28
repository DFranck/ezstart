/**
 * POST /api/scans/:id/feedback — Submit feedback on a scan
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { getScanModel } from '../models/scan.js'

const router: any = Router()

const feedbackBodySchema = z.object({
  opinion: z.enum(['agree', 'disagree']),
  comment: z.string().optional().default(''),
})

router.post('/:id/feedback', async (req: any, res: any) => {
  try {
    const validation = feedbackBodySchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors,
      })
    }

    const { opinion, comment } = validation.data

    const Scan = await getScanModel()

    const scan = await Scan.findByIdAndUpdate(
      req.params.id,
      { feedback: { opinion, comment, createdAt: new Date() } },
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
    logger.error('[feedback-scan] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    })
  }
})

export default router
