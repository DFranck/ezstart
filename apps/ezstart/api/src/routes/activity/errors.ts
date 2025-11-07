/**
 * GET /api/activity/errors
 *
 * Fetch only error logs from Sentry
 */

import { Router } from '@ezstart/express-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router = Router()

const getErrorsHandler = async (req: Request, res: Response) => {
  try {
    const { project, limit = '50', since = '7d' } = req.query as Record<
      string,
      string
    >

    const sentryClient = createSentryClient()
    if (!sentryClient) {
      return res.status(503).json({
        error: 'Sentry integration not configured',
        message: 'SENTRY_AUTH_TOKEN not provided',
      })
    }

    const issues = await sentryClient.fetchIssues({
      project,
      status: 'unresolved',
      limit: parseInt(limit, 10),
      since,
    })

    const errorLogs = sentryClient.issuesToActivityLogs(issues)

    res.json({
      total: errorLogs.length,
      errors: errorLogs,
    })
  } catch (error) {
    console.error('[Activity] Error fetching Sentry errors:', error)
    res.status(500).json({
      error: 'Failed to fetch Sentry errors',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/errors', getErrorsHandler)

export default router as ReturnType<typeof Router>
