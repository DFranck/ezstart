import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const healthRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(healthRegistry, router)
export const healthRoutes = router as ReturnType<typeof Router>

const healthChecker = new HealthChecker()

// ========================================
// Zod Schemas
// ========================================

const serviceIdParamSchema = z.object({
  serviceId: z.string().describe('Unique identifier of the service'),
})

const historyQuerySchema = z.object({
  limit: z.coerce.number().default(50).describe('Number of history entries to return'),
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

const historyResponseSchema = z.object({
  id: z.string().describe('Unique identifier of the service'),
  name: z.string().describe('Human-readable name of the service'),
  history: z.array(
    z.object({
      timestamp: z.string(),
      status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
      responseTime: z.number().nullable(),
    })
  ).describe('Historical health check results'),
  uptime: z.object({
    '24h': z.number(),
    '7d': z.number(),
    '30d': z.number(),
  }).describe('Uptime percentage for different time periods'),
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

// ========================================
// Route Handlers
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

const getServiceHistoryHandler = (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params
    const { limit = '50' } = req.query

    const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

    if (!config) {
      return res.status(404).json({ error: 'Service not found' })
    }

    const history = healthChecker.getHistory(config.name, Number(limit))
    const uptime24h = healthChecker.calculateUptime(config.name, 24)
    const uptime7d = healthChecker.calculateUptime(config.name, 24 * 7)
    const uptime30d = healthChecker.calculateUptime(config.name, 24 * 30)

    res.json({
      id: serviceId,
      name: config.name,
      history,
      uptime: {
        '24h': uptime24h,
        '7d': uptime7d,
        '30d': uptime30d,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get health check history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ========================================
// Routes with OpenAPI Documentation
// ========================================

docRouter.get('/', getAllHealthChecksHandler, {
  summary: 'Get all health check results for monitored services',
  tags: ['Health Checks'],
  responseSchema: allHealthChecksResponseSchema,
})

docRouter.get('/:serviceId', getServiceHealthHandler, {
  summary: 'Get health check for specific service',
  tags: ['Health Checks'],
  paramsSchema: serviceIdParamSchema,
  responseSchema: serviceHealthResponseSchema,
})

docRouter.get('/:serviceId/history', getServiceHistoryHandler, {
  summary: 'Get health check history with uptime statistics',
  tags: ['Health Checks'],
  paramsSchema: serviceIdParamSchema,
  querySchema: historyQuerySchema,
  responseSchema: historyResponseSchema,
})
