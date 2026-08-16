/**
 * GET /api/scans — List scan history
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/api-core'
import { PaginationQuerySchema } from '@ezstart/api-contracts'
import { findMany } from '../utils/mongoose-query.js'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getScanModel } from '../models/scan.js'

const router: ExpressRouter = Router()

const querySchema = PaginationQuerySchema.extend({
  gameType: z.enum(['summoners-war', 'nikke']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
})

// GET /scans — Get all scans (most recent first)
router.get('/', async (req, res) => {
  try {
    const validation = querySchema.safeParse(req.query)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid query parameters', validation.error.errors, 400)
    }

    const { gameType, status, limit, offset } = validation.data

    const Scan = await getScanModel()

    const filter: Record<string, string> = {}
    if (gameType) filter.gameType = gameType
    if (status) filter.status = status

    const scans = await findMany(Scan, filter)
      .select('-thumbnail')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec()

    const total = await Scan.countDocuments(filter).exec()

    // Map _id → id for frontend compatibility
    const mapped = scans.map((s: Record<string, unknown> & { _id?: { toString(): string } }) => ({
      ...s,
      id: s._id?.toString(),
      _id: undefined,
    }))

    return sendSuccess(res, mapped, { total, limit, offset })
  } catch (error) {
    logger.error('[get-scans] Error:', error)
    return sendError(res, 'Failed to fetch scans')
  }
})

export default router
