/**
 * GET /api/activity/stats
 *
 * Get activity statistics (counts by type, severity, project)
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const { since = '7d' } = req.query as Record<string, string>

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

    res.json(stats)
  } catch (error) {
    logger.error('[Activity] Error fetching activity stats:', error)
    res.status(500).json({
      error: 'Failed to fetch activity stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/stats', getStatsHandler)

export default router as ReturnType<typeof Router>
