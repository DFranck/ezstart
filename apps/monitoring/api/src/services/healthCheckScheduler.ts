/**
 * Background health check scheduler
 * Keeps Render services awake by pinging them every 5 minutes
 */

import cron from 'node-cron'
import { HealthChecker, MONITORED_SERVICES, SERVICE_PLATFORMS } from '@ezstart/monitoring'
import { getHealthCheckModel } from '../models/HealthCheck.js'
import type { ScheduledTask } from 'node-cron'
import type { Server as IOServer } from 'socket.io'

export class HealthCheckScheduler {
  private healthChecker: HealthChecker
  private isRunning = false
  private cronJob: ScheduledTask | null = null
  private io: IOServer | null = null

  constructor() {
    this.healthChecker = new HealthChecker()
  }

  /**
   * Set Socket.IO instance for real-time updates
   */
  setSocketIO(io: IOServer) {
    this.io = io
    console.log('📡 [Scheduler] Socket.IO instance attached for real-time updates')
  }

  /**
   * Start the scheduler
   * - In development: Ping production URLs only (for testing monitoring)
   * - In production: Ping Render services every 5 minutes to prevent sleep
   */
  start() {
    if (this.isRunning) {
      console.log('⏰ [Scheduler] Already running')
      return
    }

    const isDev = process.env.NODE_ENV !== 'production'
    const envLabel = isDev ? 'development' : 'production'

    console.log(`⏰ [Scheduler] Starting health check cron job in ${envLabel} mode...`)
    console.log('⏰ [Scheduler] Will check ALL production URLs every 5 minutes')
    console.log(`⏰ [Scheduler] Monitoring ${Object.keys(MONITORED_SERVICES).length} services (APIs + Web apps)`)

    if (isDev) {
      console.log('⚠️ [Scheduler] Running in DEV mode - pinging PRODUCTION URLs only (not localhost)')
    }

    // Run every 5 minutes: */5 * * * *
    // This keeps Render free tier services awake (sleep after 15min of inactivity)
    // Synced with UptimeRobot interval (5 minutes)
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.performHealthChecks()
    })

    this.isRunning = true

    // Wait before first health check to ensure MongoDB is fully operational
    // Production (Render): Wait 30s for cold starts + MongoDB Atlas connection (15-20s)
    // Development: Wait 5s for MongoDB connection only
    const initialDelay = isDev ? 5000 : 30000
    const delayLabel = isDev ? '5 seconds' : '30 seconds'

    console.log(`⏰ [Scheduler] Waiting ${delayLabel} before first health check...`)
    setTimeout(() => {
      this.performHealthChecks().catch(err => {
        console.error('❌ [Scheduler] Error during initial health check:', err)
      })
    }, initialDelay)

    console.log(`✅ [Scheduler] Health check scheduler started (${envLabel} mode)`)
  }

  /**
   * Perform health checks on all production services
   */
  private async performHealthChecks() {
    const startTime = Date.now()
    console.log(`⏰ [Scheduler] Running health checks at ${new Date().toISOString()}`)

    try {
      // Get shared MongoDB connection
      const HealthCheck = await getHealthCheckModel()

      // Get ALL services (not just Render)
      const allServiceIds = Object.keys(MONITORED_SERVICES) as Array<keyof typeof MONITORED_SERVICES>

      const results = await Promise.all(
        allServiceIds.map(async serviceId => {
          try {
            const config = MONITORED_SERVICES[serviceId]

            // Check production URL with short timeout (don't wait for cold start)
            const result = await this.healthChecker.check({
              name: config.name,
              type: config.type,
              url: config.productionUrl,
              timeout: 10000, // 10s timeout
              interval: 300000, // 5min
              retries: 0, // No retries, just ping
            })

            // Save to MongoDB for history/graphs
            // @ts-expect-error - Mongoose create() type inference issue with strict TypeScript
            await HealthCheck.create({
              serviceId,
              status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
              responseTime: result.responseTime,
              timestamp: new Date(),
              error: result.error,
              metadata: result.metadata,
            })

            return { serviceId, result }
          } catch (error) {
            console.error(`❌ [Scheduler] Error checking ${serviceId}:`, error)

            // Still save failed check to MongoDB
            try {
              // @ts-expect-error - Mongoose create() type inference issue with strict TypeScript
              await HealthCheck.create({
                serviceId,
                status: 'unhealthy',
                responseTime: null,
                timestamp: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            } catch (dbError) {
              console.error(`❌ [Scheduler] Failed to save health check to DB:`, dbError)
            }

            return { serviceId, result: null }
          }
        })
      )

      const duration = Date.now() - startTime
      const healthyCount = results.filter(r => r.result?.status === 'healthy').length
      const unhealthyCount = results.length - healthyCount

      // Concise logging: Only show details when there are issues
      if (unhealthyCount === 0) {
        console.log(`✅ [Scheduler] All ${results.length} services healthy in ${duration}ms`)
      } else {
        console.log(
          `⚠️ [Scheduler] Health checks completed in ${duration}ms: ${healthyCount}/${results.length} healthy`
        )

        // Only log unhealthy services
        results.forEach(({ serviceId, result }) => {
          if (result?.status !== 'healthy') {
            const responseTime = result?.responseTime ? `${result.responseTime}ms` : 'timeout'
            console.log(`  ❌ ${serviceId}: ${result?.status || 'error'} (${responseTime})`)
          }
        })
      }

      // Emit real-time update to connected clients
      if (this.io) {
        this.io.emit('health-checks-updated', {
          timestamp: new Date().toISOString(),
          summary: {
            total: results.length,
            healthy: healthyCount,
            unhealthy: results.length - healthyCount,
          },
          duration,
        })
        console.log(`📡 [Scheduler] Emitted health-checks-updated event to ${this.io.engine.clientsCount} clients`)
      }
    } catch (error) {
      console.error('❌ [Scheduler] Error during health checks:', error)
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
      this.isRunning = false
      console.log('⏰ [Scheduler] Health check scheduler stopped')
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      environment: process.env.NODE_ENV,
      nextRun: this.cronJob ? 'Every 5 minutes' : 'Not scheduled',
    }
  }
}
