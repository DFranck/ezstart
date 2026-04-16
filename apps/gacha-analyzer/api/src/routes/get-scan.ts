/**
 * GET /api/scans/:id — Get scan detail
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { findById } from '../utils/mongoose-query.js'
import type { Router as ExpressRouter } from 'express'
import { getScanModel } from '../models/scan.js'

const router: ExpressRouter = Router()

// GET /scans/:id — Get a single scan by ID
router.get('/:id', async (req, res) => {
  try {
    const Scan = await getScanModel()

    const scan = await findById(Scan, req.params.id).lean().exec()

    if (!scan) {
      return sendError(res, 'Scan not found', 404)
    }

    // Map _id → id for frontend compatibility
    const mapped = { ...scan, id: (scan as Record<string, any>)._id?.toString(), _id: undefined }

    return sendSuccess(res, mapped)
  } catch (error) {
    logger.error('[get-scan] Error:', error)
    return sendError(res, 'Failed to fetch scan')
  }
})

export default router
