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
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { getPerformanceMetricModel } from '../../models/PerformanceMetric.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const recordMetricSchema = z.object({
  serviceId: z.string().min(1).describe('Service identifier'),
  metricType: z.string().min(1).describe('Type of metric'),
  endpoint: z.string().optional().describe('Endpoint path'),
  duration: z.number().min(0).describe('Duration in ms'),
  status: z.enum(['success', 'error']).describe('Metric status'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
})

export const router: ReturnType<typeof Router> = Router()

const recordMetricHandler = async (req: Request, res: Response) => {
  try {
    const validation = recordMetricSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid metric data', validation.error.errors)
    }

    const { serviceId, metricType, endpoint, duration, status, metadata } = validation.data

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

    res.status(201).json({ success: true, data: { metricId: metric._id } })
  } catch (error) {
    logger.error('[Performance] Error recording metric:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to record performance metric')
  }
}

router.post('/', recordMetricHandler)

export default router as ReturnType<typeof Router>
