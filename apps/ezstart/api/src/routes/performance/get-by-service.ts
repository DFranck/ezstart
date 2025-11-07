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

import { Router } from '@ezstart/express-core'
import { getPerformanceMetricModel, type IPerformanceMetric } from '../../models/PerformanceMetric.js'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const getByServiceHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const hours = Math.min(Number(req.query.hours) || 24, 168)
    const metricType = req.query.metricType as string | undefined
    const endpoint = req.query.endpoint as string | undefined

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const PerformanceMetric = await getPerformanceMetricModel()

    // Build query
    const query: any = {
      serviceId,
      timestamp: { $gte: cutoffTime },
    }

    if (metricType) {
      query.metricType = metricType
    }

    if (endpoint) {
      query.endpoint = endpoint
    }

    const metrics = (await PerformanceMetric.find(query)
      .sort({ timestamp: 1 })
      .lean()
      .exec()) as IPerformanceMetric[]

    // Calculate aggregated stats
    const totalMetrics = metrics.length
    const successMetrics = metrics.filter(m => m.status === 'success')
    const errorMetrics = metrics.filter(m => m.status === 'error')

    const durations = successMetrics.map(m => m.duration)
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : null

    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p50 = sortedDurations.length > 0
      ? Math.round(sortedDurations[Math.floor(sortedDurations.length * 0.5)] ?? 0)
      : null

    const p95 = sortedDurations.length > 0
      ? Math.round(sortedDurations[Math.floor(sortedDurations.length * 0.95)] ?? 0)
      : null

    const p99 = sortedDurations.length > 0
      ? Math.round(sortedDurations[Math.floor(sortedDurations.length * 0.99)] ?? 0)
      : null

    const maxDuration = durations.length > 0 ? Math.max(...durations) : null
    const minDuration = durations.length > 0 ? Math.min(...durations) : null

    res.json({
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
        errorRate: totalMetrics > 0 ? ((errorMetrics.length / totalMetrics) * 100).toFixed(2) + '%' : '0%',
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
    })
  } catch (error) {
    console.error('[Performance] Error fetching metrics:', error)
    res.status(500).json({
      error: 'Failed to fetch performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/:serviceId', getByServiceHandler)

export default router as ReturnType<typeof Router>
