/**
 * POST /api/performance
 *
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

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { getPerformanceMetricModel } from '../../models/PerformanceMetric.js'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const recordMetricHandler = async (req: Request, res: Response) => {
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
    logger.error('[Performance] Error recording metric:', error)
    res.status(500).json({
      error: 'Failed to record performance metric',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.post('/', recordMetricHandler)

export default router as ReturnType<typeof Router>
