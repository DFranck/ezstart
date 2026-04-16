/**
 * GET /api/performance/:serviceId
 *
 * Get performance metrics for a service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168 = 7 days)
 * - metricType: Filter by metric type (optional)
 * - endpoint: Filter by endpoint (optional)
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import {
  getPerformanceMetricModel,
  type IPerformanceMetric,
} from '../../models/PerformanceMetric.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const performanceQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).describe('Hours to look back'),
  metricType: z.string().optional().describe('Filter by metric type'),
  endpoint: z.string().optional().describe('Filter by endpoint'),
  limit: z.coerce.number().min(1).max(1000).default(50).describe('Max number of metrics'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const router: ReturnType<typeof Router> = Router()

const getByServiceHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const parsed = performanceQuerySchema.safeParse(req.query)
    const { hours, metricType, endpoint, limit, offset } = parsed.success
      ? parsed.data
      : {
          hours: Math.min(Number(req.query.hours) || 24, 168),
          metricType: req.query.metricType as string | undefined,
          endpoint: req.query.endpoint as string | undefined,
          limit: Math.min(Number(req.query.limit) || 50, 1000),
          offset: Math.max(Number(req.query.offset) || 0, 0),
        }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const PerformanceMetric = await getPerformanceMetricModel()

    // Build query
    const query: Record<string, unknown> = {
      serviceId,
      timestamp: { $gte: cutoffTime },
    }

    if (metricType) {
      query.metricType = metricType
    }

    if (endpoint) {
      query.endpoint = endpoint
    }

    const [metrics, total] = await Promise.all([
      PerformanceMetric.find(query)
        .sort({ timestamp: 1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec() as Promise<IPerformanceMetric[]>,
      PerformanceMetric.countDocuments(query),
    ])

    // Calculate aggregated stats
    const totalMetrics = metrics.length
    const successMetrics = metrics.filter(m => m.status === 'success')
    const errorMetrics = metrics.filter(m => m.status === 'error')

    const durations = successMetrics.map(m => m.duration)
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : null

    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p50 =
      sortedDurations.length > 0
        ? Math.round(sortedDurations[Math.floor(sortedDurations.length * 0.5)] ?? 0)
        : null

    const p95 =
      sortedDurations.length > 0
        ? Math.round(sortedDurations[Math.floor(sortedDurations.length * 0.95)] ?? 0)
        : null

    const p99 =
      sortedDurations.length > 0
        ? Math.round(sortedDurations[Math.floor(sortedDurations.length * 0.99)] ?? 0)
        : null

    const maxDuration = durations.length > 0 ? Math.max(...durations) : null
    const minDuration = durations.length > 0 ? Math.min(...durations) : null

    sendSuccess(
      res,
      {
        serviceId,
        hours,
        filters: {
          metricType: metricType || 'all',
          endpoint: endpoint || 'all',
        },
        stats: {
          totalMetrics,
          successCount: successMetrics.length,
          errorCount: errorMetrics.length,
          errorRate:
            totalMetrics > 0 ? ((errorMetrics.length / totalMetrics) * 100).toFixed(2) + '%' : '0%',
          avgDuration,
          p50,
          p95,
          p99,
          minDuration,
          maxDuration,
        },
        metrics: metrics.map(m => ({
          metricType: m.metricType,
          endpoint: m.endpoint,
          duration: m.duration,
          status: m.status,
          timestamp: m.timestamp,
          metadata: m.metadata,
        })),
      },
      { total, limit, offset }
    )
  } catch (error) {
    logger.error('[Performance] Error fetching metrics:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch performance metrics')
  }
}

router.get('/:serviceId', getByServiceHandler)

export default router as ReturnType<typeof Router>
