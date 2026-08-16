/**
 * GET /api/activity/stats
 *
 * Get activity statistics (counts by type, severity, project)
 *
 * NOTE: Sentry was removed 2026-04-25 — counters return zero until a
 * replacement collector is wired in (deployments / health / audits).
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import type { Request, Response } from 'express'
import { z } from 'zod'

const statsQuerySchema = z.object({
  since: z.string().default('7d').describe('Relative time or ISO timestamp'),
})

export const router: ReturnType<typeof Router> = Router()

const getStatsHandler = async (req: Request, res: Response) => {
  try {
    statsQuerySchema.safeParse(req.query)

    const stats = {
      errors: 0,
      deployments: 0,
      healthChanges: 0,
      auditUpdates: 0,
      bySeverity: {
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
        success: 0,
      },
    }

    sendSuccess(res, stats)
  } catch (error) {
    logger.error({ err: error }, '[Activity] Error fetching activity stats')
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch activity stats')
  }
}

router.get('/stats', getStatsHandler)

export default router as ReturnType<typeof Router>
