/**
 * POST /api/scans/:id/feedback — Submit feedback on a scan
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
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
      return sendValidationError(res, 'Invalid request body', validation.error.errors, 400)
    }

    const { opinion, comment } = validation.data

    const Scan = await getScanModel()

    const scan = await Scan.findByIdAndUpdate(
      req.params.id,
      { feedback: { opinion, comment, createdAt: new Date() } },
      { new: true }
    ).lean()

    if (!scan) {
      return sendError(res, 'Scan not found', 404)
    }

    return sendSuccess(res, { ...(scan as any), id: (scan as any)._id?.toString(), _id: undefined })
  } catch (error) {
    logger.error('[feedback-scan] Error:', error)
    return sendError(res, 'Failed to submit feedback')
  }
})

export default router
