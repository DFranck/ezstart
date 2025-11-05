import { Router } from '@ezstart/express-core'
import { getPerformanceMetricModel, type IPerformanceMetric } from '../models/PerformanceMetric.js'

const performanceRouter = Router()

/**
 * POST /api/performance
 * Record a performance metric
 *
 * Body:
 * {
 *   serviceId: 'ezauth-api',
 *   metricType: 'api_response_time',
 *   endpoint: '/api/auth/login',
 *   duration: 245,
 *   status: 'success',
 *   metadata?: { method: 'POST', statusCode: 200 }
 * }
 */
performanceRouter.post('/', async (req, res) => {
  try {
    const { serviceId, metricType, endpoint, duration, status, metadata } = req.body

    // Validation
    if (!serviceId || !metricType || duration === undefined || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['serviceId', 'metricType', 'duration', 'status'],
      })
    }

    const PerformanceMetric = await getPerformanceMetricModel()

    const metric = await PerformanceMetric.create({
      serviceId,
      metricType,
      endpoint,
      duration,
      status,
      timestamp: new Date(),
      metadata: metadata || {},
    })

    res.status(201).json({
      success: true,
      metricId: metric._id,
    })
  } catch (error) {
    console.error('[Performance] Error recording metric:', error)
    res.status(500).json({
      error: 'Failed to record performance metric',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/performance/:serviceId
 * Get performance metrics for a service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24, max: 168 = 7 days)
 * - metricType: Filter by metric type (optional)
 * - endpoint: Filter by endpoint (optional)
 */
performanceRouter.get('/:serviceId', async (req, res) => {
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

    const p50 = durations.length > 0
      ? Math.round(durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.5)])
      : null

    const p95 = durations.length > 0
      ? Math.round(durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)])
      : null

    const p99 = durations.length > 0
      ? Math.round(durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)])
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
})

/**
 * GET /api/performance/:serviceId/endpoints
 * Get slowest endpoints for a service
 *
 * Query params:
 * - hours: Number of hours to look back (default: 24)
 * - limit: Number of endpoints to return (default: 10)
 */
performanceRouter.get('/:serviceId/endpoints', async (req, res) => {
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
    console.error('[Performance] Error fetching endpoint stats:', error)
    res.status(500).json({
      error: 'Failed to fetch endpoint statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default performanceRouter as ReturnType<typeof Router>
