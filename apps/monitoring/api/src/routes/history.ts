import { Router, type RequestHandler } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import { HealthCheck } from '../models/HealthCheck.js'
import { getMockServiceHistory } from '../utils/mockHistory.js'

const historyRouter = Router()
const isDev = process.env.NODE_ENV !== 'production'

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

    // In dev: use mock data, in prod: use real MongoDB data
    if (isDev) {
      const mockData = getMockServiceHistory(serviceId, hours)
      return res.json({
        hours,
        ...mockData,
      })
    }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

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
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/history/project/:projectId
 * Get health check history for all services in a project
 *
 * For example: project 'ezauth' returns history for:
 * - ezauth-api
 * - ezauth-web
 */
historyRouter.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params as { projectId: string }
    const hours = Math.min(Number(req.query.hours) || 24, 168)

    // Map project to service IDs
    const serviceIds = [`${projectId}-api`, `${projectId}-web`]

    // In dev: use mock data, in prod: use real MongoDB data
    if (isDev) {
      const mockServices = serviceIds.map(serviceId => getMockServiceHistory(serviceId, hours))
      return res.json({
        projectId,
        hours,
        services: mockServices,
      })
    }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

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

    // Filter out null results (services that don't exist)
    const validHistories = histories.filter(h => h !== null)

    res.json({
      projectId,
      hours,
      services: validHistories,
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch project history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default historyRouter as ReturnType<typeof Router>
