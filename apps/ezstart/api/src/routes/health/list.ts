/**
 * GET /api/health-checks
 *
 * Get all health check results for monitored services
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

const healthCheckSummarySchema = z.object({
  total: z.number(),
  healthy: z.number(),
  degraded: z.number(),
  unhealthy: z.number(),
  unknown: z.number(),
})

const allHealthChecksResponseSchema = z.object({
  services: z.array(healthCheckResultSchema).describe('List of health check results for all services'),
  environment: z.enum(['development', 'production']).describe('Current environment (development or production)'),
  summary: healthCheckSummarySchema.describe('Summary statistics of health checks'),
})

// ========================================
// Route Handler
// ========================================

const getAllHealthChecksHandler = async (_: Request, res: Response) => {
  try {
    const environment =
      process.env.NODE_ENV === 'production' ? 'production' : 'development'
    const timeout = Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    const retries = Number(process.env.HEALTH_CHECK_RETRIES) || 3

    const allResults = await Promise.all(
      Object.keys(MONITORED_SERVICES).map(async serviceId => {
        const config =
          MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

        // Check all environments for this service
        const envResults = await healthChecker.checkAllEnvironments(
          serviceId as keyof typeof MONITORED_SERVICES,
          environment,
          { timeout, retries }
        )

        // Return all environment checks for this service
        return envResults.map(result => ({
          id: serviceId,
          serviceId,
          ...result,
          uptime: healthChecker.calculateUptime(result.name, 24),
          avgResponseTime: healthChecker.getAverageResponseTime(result.name, 10),
        }))
      })
    )

    // Flatten results (we get array of arrays)
    const results = allResults.flat()

    res.json({
      services: results,
      environment,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length,
        unknown: results.filter(r => r.status === 'unknown').length,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to perform health checks',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ========================================
// Route Registration
// ========================================

docRouter.get('/', getAllHealthChecksHandler, {
  summary: 'Get all health check results for monitored services',
  tags: ['Health Checks'],
  responseSchema: allHealthChecksResponseSchema,
})

export default router as ReturnType<typeof Router>
