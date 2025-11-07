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

import { Router } from '@ezstart/express-core'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const getByProjectHandler = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string }
    const hours = Math.min(Number(req.query.hours) || 24, 168)

    // Map project to service IDs
    const serviceIds = [`${projectId}-api`, `${projectId}-web`]

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const HealthCheck = await getHealthCheckModel()

    const histories = await Promise.all(
      serviceIds.map(async serviceId => {
        const history = (await HealthCheck.find({
          serviceId,
          timestamp: { $gte: cutoffTime },
        })
          .sort({ timestamp: 1 })
          .select('status responseTime timestamp error')
          .lean()
          .exec()) as any[]

        // No data = return null (will be filtered out)
        if (history.length === 0) return null

        const totalChecks = history.length
        const healthyChecks = history.filter((h: any) => h.status === 'healthy').length
        const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

        const healthyWithResponse = history.filter((h: any) => h.status === 'healthy' && h.responseTime !== null)
        const avgResponseTime =
          healthyWithResponse.length > 0
            ? healthyWithResponse.reduce((sum: number, h: any) => sum + (h.responseTime || 0), 0) / healthyWithResponse.length
            : null

        return {
          serviceId,
          totalChecks,
          healthyChecks,
          uptimePercentage: Number(uptimePercentage.toFixed(2)),
          avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
          history: history.map((h: any) => ({
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
    res.json({
      projectId,
      hours,
      services: validHistories,
    })
  } catch (error) {
    // Real error (DB connection, query failure, etc) = 500
    console.error('[History] Error fetching project history:', error)
    res.status(500).json({
      error: 'Failed to fetch project history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/project/:projectId', getByProjectHandler)

export default router as ReturnType<typeof Router>
