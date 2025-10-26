/**
 * Activity Routes
 *
 * Unified activity feed showing:
 * - Sentry errors
 * - Deployment events
 * - Health changes
 * - Audit updates
 */

import { Router } from '@ezstart/express-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { ActivityLog } from '@ezstart/monitoring'

const router = Router()

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
router.get('/', async (req, res) => {
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
          console.error('[Activity] Failed to fetch Sentry errors:', error)
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
    console.error('[Activity] Error fetching activity logs:', error)
    res.status(500).json({
      error: 'Failed to fetch activity logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/activity/errors
 *
 * Fetch only error logs from Sentry
 */
router.get('/errors', async (req, res) => {
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
})

/**
 * GET /api/activity/stats
 *
 * Get activity statistics (counts by type, severity, project)
 */
router.get('/stats', async (req, res) => {
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
        console.error('[Activity] Failed to fetch Sentry stats:', error)
      }
    }

    res.json(stats)
  } catch (error) {
    console.error('[Activity] Error fetching activity stats:', error)
    res.status(500).json({
      error: 'Failed to fetch activity stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router as ReturnType<typeof Router>
