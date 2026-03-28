/**
 * GET /api/activity/stats
 *
 * Get activity statistics (counts by type, severity, project)
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { Request, Response } from 'express'
import { z } from 'zod'

const statsQuerySchema = z.object({
  since: z.string().default('7d').describe('Relative time or ISO timestamp'),
})

export const router: ReturnType<typeof Router> = Router()

const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const parsed = statsQuerySchema.safeParse(req.query)
    const { since = '7d' } = parsed.success ? parsed.data : req.query as any

    const sentryClient = createSentryClient()
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

    // Fetch Sentry errors
    if (sentryClient) {
      try {
        const issues = await sentryClient.fetchIssues({
          status: 'unresolved',
          limit: 100,
          since,
        })
        const errorLogs = sentryClient.issuesToActivityLogs(issues)

        stats.errors = errorLogs.length
        errorLogs.forEach(log => {
          stats.bySeverity[log.severity]++
        })
      } catch (error) {
        logger.error('[Activity] Failed to fetch Sentry stats:', error)
      }
    }

    sendSuccess(res, stats)
  } catch (error) {
    logger.error('[Activity] Error fetching activity stats:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch activity stats')
  }
}

router.get('/stats', getStatsHandler)

export default router as ReturnType<typeof Router>
