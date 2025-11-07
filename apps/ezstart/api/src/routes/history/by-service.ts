/**
 * GET /api/history/:serviceId
 *
 * Get health check history for a specific service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168 = 7 days)
 */

import { Router } from '@ezstart/express-core'
import { getHealthCheckModel } from '../../models/HealthCheck.js'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const getByServiceHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params as { serviceId: string }
    const hours = Math.min(Number(req.query.hours) || 24, 168) // Max 7 days

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const HealthCheck = await getHealthCheckModel()

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
}

router.get('/:serviceId', getByServiceHandler)

export default router as ReturnType<typeof Router>
