/**
 * GET /api/history/:serviceId
 *
 * Get health check history for a specific service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168 = 7 days)
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const serviceHistoryQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).describe('Hours to look back'),
  limit: z.coerce.number().min(1).max(1000).default(50).describe('Max number of records'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const router: ReturnType<typeof Router> = Router()

const getByServiceHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params as { serviceId: string }
    const parsed = serviceHistoryQuerySchema.safeParse(req.query)
    const { hours, limit, offset } = parsed.success
      ? parsed.data
      : {
          hours: Math.min(Number(req.query.hours) || 24, 168),
          limit: Math.min(Number(req.query.limit) || 50, 1000),
          offset: Math.max(Number(req.query.offset) || 0, 0),
        }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const HealthCheck = await getHealthCheckModel()

    const filter = { serviceId, timestamp: { $gte: cutoffTime } }

    const [history, total] = await Promise.all([
      HealthCheck.find(filter)
        .sort({ timestamp: 1 })
        .skip(offset)
        .limit(limit)
        .select('status responseTime timestamp error')
        .lean()
        .exec() as Promise<
        Array<{
          status: string
          responseTime: number | null
          timestamp: Date
          error: string | null
        }>
      >,
      HealthCheck.countDocuments(filter),
    ])

    // Calculate uptime percentage
    const totalChecks = history.length
    const healthyChecks = history.filter(
      (h: { status: string; responseTime?: number | null }) => h.status === 'healthy'
    ).length
    const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

    // Calculate average response time (only healthy checks)
    const healthyWithResponse = history.filter(
      (h: { status: string; responseTime?: number | null }) =>
        h.status === 'healthy' && h.responseTime !== null
    )
    const avgResponseTime =
      healthyWithResponse.length > 0
        ? healthyWithResponse.reduce(
            (sum: number, h: { responseTime?: number | null }) => sum + (h.responseTime || 0),
            0
          ) / healthyWithResponse.length
        : null

    // Empty data is OK (200), return empty history
    sendSuccess(
      res,
      {
        serviceId,
        hours,
        totalChecks,
        healthyChecks,
        uptimePercentage: Number(uptimePercentage.toFixed(2)),
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
        history: history.map((h: Record<string, unknown>) => ({
          status: h.status,
          responseTime: h.responseTime,
          timestamp: h.timestamp,
          error: h.error,
        })),
      },
      { total, limit, offset }
    )
  } catch (error) {
    // Real error (DB connection, query failure, etc) = 500
    logger.error('[History] Error fetching service history:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch history')
  }
}

router.get('/:serviceId', getByServiceHandler)

export default router as ReturnType<typeof Router>
