import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'

export const healthRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(healthRegistry, router)
export const healthRoutes = router as ReturnType<typeof Router>

const healthChecker = new HealthChecker()

/**
 * GET /api/health-checks
 * Get all health check results
 *
 * Environment behavior:
 * - Development: Checks ONLY local URLs
 * - Production: Checks ALL production URLs
 *   - Railway (EZAuth, EZPay): For monitoring
 *   - Render (EZBill, TD, GreenPulse): To prevent sleep
 *   - Vercel (Web apps): For uptime monitoring
 */
router.get('/', async (_, res) => {
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
})

/**
 * GET /api/health-checks/:serviceId
 * Get health check result for specific service
 *
 * Environment behavior:
 * - Development: Returns checks for ALL URLs (local + production)
 * - Production: Returns check for ONLY production URL
 */
router.get('/:serviceId', async (req, res) => {
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
