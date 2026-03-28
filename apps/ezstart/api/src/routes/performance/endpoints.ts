/**
 * GET /api/performance/:serviceId/endpoints
 *
 * Get slowest endpoints for a service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24)
 * - limit: Number of endpoints to return (default: 10)
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { getPerformanceMetricModel } from '../../models/PerformanceMetric.js'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const getEndpointsHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const hours = Math.min(Number(req.query.hours) || 24, 168)
    const limit = Math.min(Number(req.query.limit) || 10, 50)

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const PerformanceMetric = await getPerformanceMetricModel()

    // Aggregate by endpoint
    const endpointStats = await PerformanceMetric.aggregate([
      {
        $match: {
          serviceId,
          timestamp: { $gte: cutoffTime },
          endpoint: { $exists: true, $ne: null },
          status: 'success',
        },
      },
      {
        $group: {
          _id: '$endpoint',
          avgDuration: { $avg: '$duration' },
          maxDuration: { $max: '$duration' },
          minDuration: { $min: '$duration' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { avgDuration: -1 },
      },
      {
        $limit: limit,
      },
    ])

    res.json({
      serviceId,
      hours,
      slowestEndpoints: endpointStats.map((stat: any) => ({
        endpoint: stat._id,
        avgDuration: Math.round(stat.avgDuration),
        maxDuration: stat.maxDuration,
        minDuration: stat.minDuration,
        requestCount: stat.count,
      })),
    })
  } catch (error) {
    logger.error('[Performance] Error fetching endpoint stats:', error)
    res.status(500).json({
      error: 'Failed to fetch endpoint statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/:serviceId/endpoints', getEndpointsHandler)

export default router as ReturnType<typeof Router>
