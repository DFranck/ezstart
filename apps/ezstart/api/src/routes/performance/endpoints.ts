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
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getPerformanceMetricModel } from '../../models/PerformanceMetric.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const endpointsQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).describe('Hours to look back'),
  limit: z.coerce.number().min(1).max(50).default(10).describe('Number of endpoints to return'),
})

export const router: ReturnType<typeof Router> = Router()

const getEndpointsHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const parsed = endpointsQuerySchema.safeParse(req.query)
    const { hours, limit } = parsed.success ? parsed.data : { hours: Math.min(Number(req.query.hours) || 24, 168), limit: Math.min(Number(req.query.limit) || 10, 50) }

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

    sendSuccess(res, {
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
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch endpoint statistics')
  }
}

router.get('/:serviceId/endpoints', getEndpointsHandler)

export default router as ReturnType<typeof Router>
