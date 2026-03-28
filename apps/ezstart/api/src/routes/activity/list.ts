/**
 * GET /api/activity
 *
 * Fetch all activity logs (errors, deployments, health changes, audits)
 * Sorted by timestamp (most recent first)
 *
 * Query params:
 * - type: Filter by activity type (error, deployment, health_change, audit_update)
 * - severity: Filter by severity (critical, error, warning, info, success)
 * - project: Filter by project slug
 * - limit: Max number of logs (default: 50)
 * - since: Relative time (e.g., '24h', '7d') or ISO timestamp
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { ActivityLog } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const listActivityHandler = async (req: Request, res: Response) => {
  try {
    const {
      type,
      severity,
      project,
      limit = '50',
      since = '7d',
    } = req.query as Record<string, string>

    const allLogs: ActivityLog[] = []

    // 1. Fetch Sentry errors (if enabled)
    if (!type || type === 'error') {
      const sentryClient = createSentryClient()
      if (sentryClient) {
        try {
          const issues = await sentryClient.fetchIssues({
            project,
            status: 'unresolved',
            limit: parseInt(limit, 10),
            since,
          })
          const errorLogs = sentryClient.issuesToActivityLogs(issues)
          allLogs.push(...errorLogs)
        } catch (error) {
          logger.error('[Activity] Failed to fetch Sentry errors:', error)
        }
      }
    }

    // 2. TODO: Fetch deployment events from Railway/Vercel webhooks
    // 3. TODO: Fetch health changes from MongoDB
    // 4. TODO: Fetch audit updates from MongoDB

    // Filter by severity if specified
    let filteredLogs = allLogs
    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity)
    }

    // Sort by timestamp (most recent first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Limit results
    filteredLogs = filteredLogs.slice(0, parseInt(limit, 10))

    res.json({
      total: filteredLogs.length,
      logs: filteredLogs,
    })
  } catch (error) {
    logger.error('[Activity] Error fetching activity logs:', error)
    res.status(500).json({
      error: 'Failed to fetch activity logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/', listActivityHandler)

export default router as ReturnType<typeof Router>
