import { Router } from '@ezstart/express-core'
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'
import { HealthCheck } from '../models/HealthCheck.js'

const triggerRouter = Router()
const healthChecker = new HealthChecker()

/**
 * POST /api/trigger-checks
 * Manually trigger health checks on all services
 * Returns immediately and runs checks in background
 */
triggerRouter.post('/', async (req, res) => {
  try {
    const isDev = process.env.NODE_ENV !== 'production'

    // Return immediately
    res.json({
      message: 'Health checks triggered',
      environment: isDev ? 'development' : 'production',
      servicesCount: Object.keys(MONITORED_SERVICES).length,
    })

    // Run checks in background
    const serviceIds = Object.keys(MONITORED_SERVICES)

    Promise.all(
      serviceIds.map(async serviceId => {
        try {
          const config = MONITORED_SERVICES[serviceId as keyof typeof MONITORED_SERVICES]

          // In dev: use local URL, in prod: use production URL
          const url = isDev ? config.localUrl : config.productionUrl

          const result = await healthChecker.check({
            name: config.name,
            type: config.type,
            url,
            timeout: isDev ? 5000 : 10000,
            interval: 300000,
            retries: 0,
          })

          // Save to MongoDB
          await HealthCheck.create({
            serviceId,
            status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
            responseTime: result.responseTime,
            timestamp: new Date(),
            error: result.error,
            metadata: result.metadata,
          })

          console.log(
            `✅ [Trigger] ${serviceId}: ${result.status} (${result.responseTime || 'N/A'}ms)`
          )

          return { serviceId, result }
        } catch (error) {
          console.error(`❌ [Trigger] Error checking ${serviceId}:`, error)

          // Save failed check
          try {
            await HealthCheck.create({
              serviceId,
              status: 'unhealthy',
              responseTime: null,
              timestamp: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          } catch (dbError) {
            console.error(`❌ [Trigger] Failed to save health check to DB:`, dbError)
          }

          return { serviceId, result: null }
        }
      })
    ).then(results => {
      const healthyCount = results.filter(r => r.result?.status === 'healthy').length
      console.log(
        `✅ [Trigger] Completed manual health checks: ${healthyCount}/${results.length} healthy`
      )
    })
  } catch (error) {
    console.error('[Trigger] Error:', error)
    res.status(500).json({
      error: 'Failed to trigger health checks',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default triggerRouter
