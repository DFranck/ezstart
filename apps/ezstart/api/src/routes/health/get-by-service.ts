/**
 * GET /api/health-checks/:serviceId
 *
 * Get health check for specific service
 */

import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'
import type { Request, Response } from 'express'
import { z } from 'zod'

export const registry = new OpenAPIRegistry()
export const router = Router()
const docRouter = createRouterWithDoc(registry, router)

const healthChecker = new HealthChecker()

// ========================================
// Zod Schemas
// ========================================

const serviceIdParamSchema = z.object({
  serviceId: z.string().describe('Unique identifier of the service'),
})

const healthCheckResultSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  name: z.string(),
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
  responseTime: z.number().nullable(),
  error: z.string().optional(),
  uptime: z.number(),
  avgResponseTime: z.number(),
})

const serviceHealthResponseSchema = z.object({
  serviceId: z.string().describe('Unique identifier of the service'),
  serviceName: z.string().describe('Human-readable name of the service'),
  environment: z.enum(['development', 'production']).describe('Current environment'),
  checks: z.array(
    healthCheckResultSchema.extend({
      history: z.array(
        z.object({
          timestamp: z.string(),
          status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
          responseTime: z.number().nullable(),
        })
      ),
    })
  ).describe('List of health check results with history'),
})

// ========================================
// Route Handler
// ========================================

const getServiceHealthHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

    if (!config) {
      return res.status(404).json({ error: 'Service not found' })
    }

    const environment =
      process.env.NODE_ENV === 'production' ? 'production' : 'development'
    const timeout = Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    const retries = Number(process.env.HEALTH_CHECK_RETRIES) || 3

    // Check all environments for this service
    const results = await healthChecker.checkAllEnvironments(
      serviceId as keyof typeof MONITORED_SERVICES,
      environment,
      { timeout, retries }
    )

    // Return all environment checks with history
    const detailedResults = results.map(result => ({
      id: serviceId,
      ...result,
      uptime: healthChecker.calculateUptime(result.name, 24),
      avgResponseTime: healthChecker.getAverageResponseTime(result.name, 10),
      history: healthChecker.getHistory(result.name, 10),
    }))

    res.json({
      serviceId,
      serviceName: config.name,
      environment,
      checks: detailedResults,
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check service health',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ========================================
// Route Registration
// ========================================

docRouter.get('/:serviceId', getServiceHealthHandler, {
  summary: 'Get health check for specific service',
  tags: ['Health Checks'],
  paramsSchema: serviceIdParamSchema,
  responseSchema: serviceHealthResponseSchema,
})

export default router as ReturnType<typeof Router>
