/**
 * GET /api/health-checks/:serviceId
 *
 * Get health check for specific service
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'
import type { Request, Response } from 'express'
import { z } from 'zod'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const healthChecker = new HealthChecker()

// ========================================
// Zod Schemas
// ========================================

const serviceIdParamSchema = z.object({
  serviceId: z.string().describe('Unique identifier of the service'),
})

const healthCheckResultSchema = z.object({
  id: z.string().describe('Unique identifier of the health check'),
  serviceId: z.string().describe('Identifier of the monitored service'),
  name: z.string().describe('Human-readable name of the service'),
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']).describe('Current health status'),
  responseTime: z.number().nullable().describe('Response time in ms (null if unreachable)'),
  error: z.string().optional().describe('Error message if health check failed'),
  uptime: z.number().describe('Uptime percentage over last 24 hours'),
  avgResponseTime: z.number().describe('Average response time over recent checks'),
})

const serviceHealthResponseSchema = z.object({
  serviceId: z.string().describe('Unique identifier of the service'),
  serviceName: z.string().describe('Human-readable name of the service'),
  environment: z.enum(['development', 'production']).describe('Current environment'),
  checks: z
    .array(
      healthCheckResultSchema.extend({
        history: z.array(
          z.object({
            timestamp: z.string().describe('ISO timestamp of the health check'),
            status: z
              .enum(['healthy', 'degraded', 'unhealthy', 'unknown'])
              .describe('Health status at this point'),
            responseTime: z.number().nullable().describe('Response time in ms'),
          })
        ),
      })
    )
    .describe('List of health check results with history'),
})

// ========================================
// Route Handler
// ========================================

const getServiceHealthHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

    if (!config) {
      return sendError(res, 'Service not found', 404)
    }

    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development'
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

    sendSuccess(res, {
      serviceId,
      serviceName: config.name,
      environment,
      checks: detailedResults,
    })
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to check service health')
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
