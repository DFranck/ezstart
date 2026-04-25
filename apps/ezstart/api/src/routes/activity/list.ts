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
 *
 * NOTE: Sentry was removed 2026-04-25 — error sources will return zero entries
 * until a replacement collector is wired in. Deployment / health / audit
 * sources are tracked in BACKLOG (P2 — API improvements).
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import type { Request, Response } from 'express'
import { z } from 'zod'
import type { ActivityLog } from '../../types/activity-log.js'

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
      severity,
      limit = 50,
      offset = 0,
    } = parsed.success ? parsed.data : (req.query as Record<string, string>)

    const allLogs: ActivityLog[] = []

    // TODO (BACKLOG P2 — API improvements):
    // 1. Fetch deployment events from Railway/Vercel webhooks
    // 2. Fetch health changes from MongoDB
    // 3. Fetch audit updates from MongoDB

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
    logger.error({ err: error }, '[Activity] Error fetching activity logs')
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch activity logs')
  }
}

router.get('/', listActivityHandler)

export default router as ReturnType<typeof Router>
