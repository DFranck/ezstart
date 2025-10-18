/**
 * Background health check scheduler
 * Keeps Render services awake by pinging them every 5 minutes
 */

import cron from 'node-cron'
import { HealthChecker, MONITORED_SERVICES, SERVICE_PLATFORMS } from '@ezstart/monitoring'
import { HealthCheck } from '../models/HealthCheck.js'
import type { ScheduledTask } from 'node-cron'

export class HealthCheckScheduler {
  private healthChecker: HealthChecker
  private isRunning = false
  private cronJob: ScheduledTask | null = null

  constructor() {
    this.healthChecker = new HealthChecker()
  }

  /**
   * Start the scheduler
   * - In development: Do nothing (don't ping production services)
   * - In production: Ping Render services every 5 minutes to prevent sleep
   */
  start() {
    if (this.isRunning) {
      console.log('⏰ [Scheduler] Already running')
      return
    }

    // Only run in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('⏰ [Scheduler] Skipping in development (not pinging production services)')
      return
    }

    console.log('⏰ [Scheduler] Starting health check cron job...')
    console.log('⏰ [Scheduler] Will check Render services every 5 minutes to prevent sleep')

    // Run every 5 minutes: */5 * * * *
    // This keeps Render free tier services awake (sleep after 15min of inactivity)
    // Synced with UptimeRobot interval (5 minutes)
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.performHealthChecks()
    })

    this.isRunning = true

    // Wait 5 seconds before first health check to ensure MongoDB is fully ready
    console.log('⏰ [Scheduler] Waiting 5 seconds before first health check...')
    setTimeout(() => {
      this.performHealthChecks().catch(err => {
        console.error('❌ [Scheduler] Error during initial health check:', err)
      })
    }, 5000)

    console.log('✅ [Scheduler] Health check scheduler started')
  }

  /**
   * Perform health checks on all Render services
   */
  private async performHealthChecks() {
    const startTime = Date.now()
    console.log(`⏰ [Scheduler] Running health checks at ${new Date().toISOString()}`)

    try {
      // Get Render services (the ones that need to be kept awake)
      const renderServiceIds = SERVICE_PLATFORMS.render

      const results = await Promise.all(
        renderServiceIds.map(async serviceId => {
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

      console.log(
        `✅ [Scheduler] Health checks completed in ${duration}ms: ${healthyCount}/${results.length} healthy`
      )

      // Log individual results
      results.forEach(({ serviceId, result }) => {
        const emoji = result?.status === 'healthy' ? '✅' : '❌'
        const responseTime = result?.responseTime ? `${result.responseTime}ms` : 'timeout'
        console.log(`  ${emoji} ${serviceId}: ${result?.status || 'error'} (${responseTime})`)
      })
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
