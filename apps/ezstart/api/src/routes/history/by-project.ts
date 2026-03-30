/**
 * GET /api/history/project/:projectId
 *
 * Get health check history for all services in a project
 *
 * For example: project 'ezauth' returns history for:
 * - ezauth-api
 * - ezauth-web
 *
 * IMPORTANT: This route MUST be declared BEFORE /:serviceId
 * Express matches routes in order, so /project/:projectId must come before /:serviceId
 * Otherwise, /history/project/ezauth would match /:serviceId with serviceId="project"
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const projectHistoryQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).describe('Hours to look back'),
  limit: z.coerce
    .number()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Max number of records per service'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip per service'),
})

export const router: ReturnType<typeof Router> = Router()

const getByProjectHandler = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string }
    const parsed = projectHistoryQuerySchema.safeParse(req.query)
    const { hours, limit, offset } = parsed.success
      ? parsed.data
      : {
          hours: Math.min(Number(req.query.hours) || 24, 168),
          limit: Math.min(Number(req.query.limit) || 50, 1000),
          offset: Math.max(Number(req.query.offset) || 0, 0),
        }

    // Map project to service IDs
    const serviceIds = [`${projectId}-api`, `${projectId}-web`]

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const HealthCheck = await getHealthCheckModel()

    const histories = await Promise.all(
      serviceIds.map(async serviceId => {
        const filter = { serviceId, timestamp: { $gte: cutoffTime } }

        const [history, serviceTotal] = await Promise.all([
          HealthCheck.find(filter)
            .sort({ timestamp: 1 })
            .skip(offset)
            .limit(limit)
            .select('status responseTime timestamp error')
            .lean()
            .exec() as Promise<any[]>,
          HealthCheck.countDocuments(filter),
        ])

        // No data = return null (will be filtered out)
        if (history.length === 0 && serviceTotal === 0) return null

        const totalChecks = history.length
        const healthyChecks = history.filter(
          (h: { status: string; responseTime?: number | null }) => h.status === 'healthy'
        ).length
        const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

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

        return {
          serviceId,
          totalChecks,
          healthyChecks,
          uptimePercentage: Number(uptimePercentage.toFixed(2)),
          avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
          totalRecords: serviceTotal,
          history: history.map((h: Record<string, unknown>) => ({
            status: h.status,
            responseTime: h.responseTime,
            timestamp: h.timestamp,
          })),
        }
      })
    )

    // Filter out null results (services with no data)
    const validHistories = histories.filter(h => h !== null)

    // Empty data is OK (200), return empty array
    const total = validHistories.reduce(
      (sum, h) => sum + (((h as Record<string, unknown>).totalRecords as number) || 0),
      0
    )
    sendSuccess(res, { projectId, hours, services: validHistories }, { total, limit, offset })
  } catch (error) {
    // Real error (DB connection, query failure, etc) = 500
    logger.error('[History] Error fetching project history:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch project history')
  }
}

router.get('/project/:projectId', getByProjectHandler)

export default router as ReturnType<typeof Router>
