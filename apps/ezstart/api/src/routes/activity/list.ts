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
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { ActivityLog } from '@ezstart/monitoring'
import type { Request, Response } from 'express'
import { z } from 'zod'

const activityQuerySchema = z.object({
  type: z.string().optional().describe('Filter by activity type'),
  severity: z
    .enum(['critical', 'error', 'warning', 'info', 'success'])
    .optional()
    .describe('Filter by severity'),
  project: z.string().optional().describe('Filter by project slug'),
  limit: z.coerce.number().default(50).describe('Max number of logs'),
  offset: z.coerce.number().default(0).describe('Number of items to skip'),
  since: z.string().default('7d').describe('Relative time or ISO timestamp'),
})

export const router: ReturnType<typeof Router> = Router()

const listActivityHandler = async (req: Request, res: Response) => {
  try {
    const parsed = activityQuerySchema.safeParse(req.query)
    const {
      type,
      severity,
      project,
      limit = 50,
      offset = 0,
      since = '7d',
    } = parsed.success ? parsed.data : (req.query as Record<string, string>)

    const allLogs: ActivityLog[] = []

    // 1. Fetch Sentry errors (if enabled)
    if (!type || type === 'error') {
      const sentryClient = createSentryClient()
      if (sentryClient) {
        try {
          const issues = await sentryClient.fetchIssues({
            project,
            status: 'unresolved',
            limit: Number(limit),
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

    const total = filteredLogs.length

    // Apply offset and limit
    filteredLogs = filteredLogs.slice(Number(offset), Number(offset) + Number(limit))

    sendSuccess(res, filteredLogs, { total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    logger.error('[Activity] Error fetching activity logs:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch activity logs')
  }
}

router.get('/', listActivityHandler)

export default router as ReturnType<typeof Router>
