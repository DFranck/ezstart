import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'

export const healthRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(healthRegistry, router)
export const healthRoutes = router

const healthChecker = new HealthChecker()

/**
 * GET /api/health-checks
 * Get all health check results
 */
router.get('/', async (_, res) => {
  try {
    const results = await Promise.all(
      Object.entries(MONITORED_SERVICES).map(async ([id, config]) => {
        const isProduction = process.env.NODE_ENV === 'production'
        const url = isProduction ? config.productionUrl : config.localUrl

        const result = await healthChecker.check({
          name: config.name,
          type: config.type,
          url,
          timeout: Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
          interval: Number(process.env.HEALTH_CHECK_INTERVAL) || 30000,
          retries: Number(process.env.HEALTH_CHECK_RETRIES) || 3,
        })

        return {
          id,
          ...result,
          uptime: healthChecker.calculateUptime(config.name, 24),
          avgResponseTime: healthChecker.getAverageResponseTime(config.name, 10),
        }
      })
    )

    res.json({
      services: results,
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
})

/**
 * GET /api/health-checks/:serviceId
 * Get health check result for specific service
 */
router.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params
    const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

    if (!config) {
      return res.status(404).json({ error: 'Service not found' })
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const url = isProduction ? config.productionUrl : config.localUrl

    const result = await healthChecker.checkWithRetries({
      name: config.name,
      type: config.type,
      url,
      timeout: Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
      interval: Number(process.env.HEALTH_CHECK_INTERVAL) || 30000,
      retries: Number(process.env.HEALTH_CHECK_RETRIES) || 3,
    })

    res.json({
      id: serviceId,
      ...result,
      uptime: healthChecker.calculateUptime(config.name, 24),
      avgResponseTime: healthChecker.getAverageResponseTime(config.name, 10),
      history: healthChecker.getHistory(config.name, 10),
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check service health',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/health-checks/:serviceId/history
 * Get health check history for specific service
 */
router.get('/:serviceId/history', (req, res) => {
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
})
