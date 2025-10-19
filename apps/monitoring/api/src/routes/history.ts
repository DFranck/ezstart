import { Router } from '@ezstart/express-core'
import { getHealthCheckModel } from '../models/HealthCheck.js'

const historyRouter = Router()

/**
 * GET /api/history/project/:projectId
 * Get health check history for all services in a project
 *
 * For example: project 'ezauth' returns history for:
 * - ezauth-api
 * - ezauth-web
 *
 * ⚠️ IMPORTANT: This route MUST be declared BEFORE /:serviceId
 * Express matches routes in order, so /project/:projectId must come before /:serviceId
 * Otherwise, /history/project/ezauth would match /:serviceId with serviceId="project"
 */
historyRouter.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params as { projectId: string }
    const hours = Math.min(Number(req.query.hours) || 24, 168)

    // Map project to service IDs
    const serviceIds = [`${projectId}-api`, `${projectId}-web`]

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const HealthCheck = await getHealthCheckModel()

    const histories = await Promise.all(
      serviceIds.map(async serviceId => {
        // @ts-expect-error - Mongoose type inference issue with strict TypeScript
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
})

/**
 * GET /api/history/:serviceId
 * Get health check history for a specific service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168 = 7 days)
 */
historyRouter.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params as { serviceId: string }
    const hours = Math.min(Number(req.query.hours) || 24, 168) // Max 7 days

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const HealthCheck = await getHealthCheckModel()

    // @ts-expect-error - Mongoose type inference issue with strict TypeScript
    const history = (await HealthCheck.find({
      serviceId,
      timestamp: { $gte: cutoffTime },
    })
      .sort({ timestamp: 1 }) // Oldest first for chronological graph
      .select('status responseTime timestamp error')
      .lean()
      .exec()) as any[]

    // Calculate uptime percentage
    const totalChecks = history.length
    const healthyChecks = history.filter((h: any) => h.status === 'healthy').length
    const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

    // Calculate average response time (only healthy checks)
    const healthyWithResponse = history.filter((h: any) => h.status === 'healthy' && h.responseTime !== null)
    const avgResponseTime =
      healthyWithResponse.length > 0
        ? healthyWithResponse.reduce((sum: number, h: any) => sum + (h.responseTime || 0), 0) / healthyWithResponse.length
        : null

    // Empty data is OK (200), return empty history
    res.json({
      serviceId,
      hours,
      totalChecks,
      healthyChecks,
      uptimePercentage: Number(uptimePercentage.toFixed(2)),
      avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
      history: history.map((h: any) => ({
        status: h.status,
        responseTime: h.responseTime,
        timestamp: h.timestamp,
        error: h.error,
      })),
    })
  } catch (error) {
    // Real error (DB connection, query failure, etc) = 500
    console.error('[History] Error fetching service history:', error)
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default historyRouter as ReturnType<typeof Router>
