/**
 * Adaptive Health Check Scheduler with Exponential Backoff
 *
 * Strategy:
 * - Services UP → Increase check interval progressively (save resources)
 * - Services DOWN → Reset to minimum interval (fast recovery detection)
 *
 * Platform-specific behavior:
 * - Railway APIs: Can go up to 60min intervals (save $)
 * - Render APIs: Max 10min intervals (prevent sleep after 15min)
 * - Vercel Web: Can go up to 60min intervals (no sleep)
 */

import { logger } from '@ezstart/logger/server'
import {
  HealthChecker,
  MONITORED_SERVICES,
  ADAPTIVE_CHECK_CONFIG,
  calculateNextInterval,
  getMaxIntervalForService,
  type AdaptiveCheckState,
  type MonitoredServiceId,
} from '@ezstart/monitoring'
import { getHealthCheckModel } from '../models/HealthCheck.js'
import type { Server as IOServer } from 'socket.io'

export class HealthCheckScheduler {
  private healthChecker: HealthChecker
  private isRunning = false
  private io: IOServer | null = null

  // Track adaptive state for each service
  private serviceStates = new Map<MonitoredServiceId, AdaptiveCheckState>()

  // Track scheduled timeouts for each service
  private scheduledChecks = new Map<MonitoredServiceId, NodeJS.Timeout>()

  constructor() {
    this.healthChecker = new HealthChecker()
    this.initializeServiceStates()
  }

  /**
   * Initialize adaptive states for all services
   */
  private initializeServiceStates() {
    const allServiceIds = Object.keys(MONITORED_SERVICES) as MonitoredServiceId[]

    for (const serviceId of allServiceIds) {
      this.serviceStates.set(serviceId, {
        serviceId,
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        currentInterval: ADAPTIVE_CHECK_CONFIG.MIN_INTERVAL_MS,
        nextCheckAt: new Date(Date.now() + ADAPTIVE_CHECK_CONFIG.MIN_INTERVAL_MS),
        lastStatus: 'unknown',
      })
    }
  }

  /**
   * Set Socket.IO instance for real-time updates
   */
  setSocketIO(io: IOServer) {
    this.io = io
    logger.info('📡 [Scheduler] Socket.IO instance attached for real-time updates')
  }

  /**
   * Start the adaptive scheduler
   */
  start() {
    if (this.isRunning) {
      logger.info('⏰ [Scheduler] Already running')
      return
    }

    const isDev = process.env.NODE_ENV !== 'production'
    const envLabel = isDev ? 'development' : 'production'

    logger.info(`⏰ [Scheduler] Starting ADAPTIVE health check scheduler in ${envLabel} mode...`)
    logger.info(
      `⏰ [Scheduler] Monitoring ${Object.keys(MONITORED_SERVICES).length} services with exponential backoff`
    )
    logger.info('⏰ [Scheduler] Config:')
    logger.info(`   - Min interval: ${ADAPTIVE_CHECK_CONFIG.MIN_INTERVAL_MS / 60000} minutes`)
    logger.info(`   - Max interval (Railway/Vercel): ${ADAPTIVE_CHECK_CONFIG.MAX_INTERVAL_MS / 60000} minutes`)
    logger.info(`   - Max interval (Render): ${ADAPTIVE_CHECK_CONFIG.RENDER_MAX_INTERVAL_MS / 60000} minutes`)
    logger.info(`   - Backoff multiplier: ${ADAPTIVE_CHECK_CONFIG.BACKOFF_MULTIPLIER}x`)

    this.isRunning = true

    // Start all services with initial delay
    const initialDelay = isDev ? 5000 : 30000
    const delayLabel = isDev ? '5 seconds' : '30 seconds'

    logger.info(`⏰ [Scheduler] Waiting ${delayLabel} before first health check...`)

    setTimeout(() => {
      this.scheduleAllServices()
      logger.info(`✅ [Scheduler] Adaptive health check scheduler started (${envLabel} mode)`)
    }, initialDelay)
  }

  /**
   * Schedule health checks for all services
   */
  private scheduleAllServices() {
    const allServiceIds = Object.keys(MONITORED_SERVICES) as MonitoredServiceId[]

    for (const serviceId of allServiceIds) {
      this.scheduleNextCheck(serviceId)
    }

    logger.info(`⏰ [Scheduler] Scheduled ${allServiceIds.length} services for adaptive health checks`)
  }

  /**
   * Schedule the next health check for a specific service
   */
  private scheduleNextCheck(serviceId: MonitoredServiceId) {
    // Clear existing timeout if any
    const existingTimeout = this.scheduledChecks.get(serviceId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const state = this.serviceStates.get(serviceId)
    if (!state) {
      logger.error(`❌ [Scheduler] No state found for service ${serviceId}`)
      return
    }

    const delay = state.nextCheckAt.getTime() - Date.now()
    const delayMin = Math.round(delay / 60000)

    const timeout = setTimeout(async () => {
      await this.performHealthCheck(serviceId)
    }, Math.max(delay, 0))

    this.scheduledChecks.set(serviceId, timeout)

    logger.info(
      `⏰ [Scheduler] ${serviceId}: Next check in ${delayMin}min (interval: ${state.currentInterval / 60000}min)`
    )
  }

  /**
   * Perform health check for a single service
   */
  private async performHealthCheck(serviceId: MonitoredServiceId) {
    const state = this.serviceStates.get(serviceId)
    if (!state) return

    const config = MONITORED_SERVICES[serviceId]
    const startTime = Date.now()

    try {
      const HealthCheck = await getHealthCheckModel()

      // Check production URL
      const result = await this.healthChecker.check({
        name: config.name,
        type: config.type,
        url: config.productionUrl,
        timeout: 10000,
        interval: state.currentInterval,
        retries: 0,
      })

      // Update adaptive state
      if (result.status === 'healthy') {
        state.consecutiveSuccesses++
        state.consecutiveFailures = 0
        state.lastStatus = 'healthy'
      } else {
        state.consecutiveSuccesses = 0
        state.consecutiveFailures++
        state.lastStatus = result.status
      }

      // Calculate next interval using exponential backoff
      const nextInterval = calculateNextInterval(state)
      const maxInterval = getMaxIntervalForService(serviceId)

      // Log if interval changed
      if (nextInterval !== state.currentInterval) {
        logger.info(
          `📊 [Scheduler] ${serviceId}: Interval ${state.currentInterval / 60000}min → ${nextInterval / 60000}min (status: ${result.status}, successes: ${state.consecutiveSuccesses})`
        )
      }

      state.currentInterval = nextInterval
      state.nextCheckAt = new Date(Date.now() + nextInterval)

      // Save to MongoDB
      await HealthCheck.create({
        serviceId,
        status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: result.responseTime,
        timestamp: new Date(),
        error: result.error,
        metadata: {
          ...result.metadata,
          adaptiveInterval: nextInterval,
          maxInterval,
          consecutiveSuccesses: state.consecutiveSuccesses,
          consecutiveFailures: state.consecutiveFailures,
        },
      })

      const duration = Date.now() - startTime

      // Log result
      if (result.status === 'healthy') {
        logger.info(
          `✅ [Scheduler] ${serviceId}: ${result.status} (${result.responseTime}ms) - Next in ${nextInterval / 60000}min`
        )
      } else {
        logger.info(
          `❌ [Scheduler] ${serviceId}: ${result.status} (${duration}ms) - Reset to ${ADAPTIVE_CHECK_CONFIG.MIN_INTERVAL_MS / 60000}min`
        )
      }

      // Emit real-time update
      if (this.io) {
        this.io.emit('health-check-updated', {
          serviceId,
          status: result.status,
          responseTime: result.responseTime,
          nextCheckIn: nextInterval,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.error(`❌ [Scheduler] Error checking ${serviceId}:`, error)

      // Reset to minimum interval on error
      state.consecutiveSuccesses = 0
      state.consecutiveFailures++
      state.lastStatus = 'unhealthy'
      state.currentInterval = ADAPTIVE_CHECK_CONFIG.MIN_INTERVAL_MS
      state.nextCheckAt = new Date(Date.now() + ADAPTIVE_CHECK_CONFIG.MIN_INTERVAL_MS)

      // Save error to MongoDB
      try {
        const HealthCheck = await getHealthCheckModel()
        await HealthCheck.create({
          serviceId,
          status: 'unhealthy',
          responseTime: null,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } catch (dbError) {
        logger.error(`❌ [Scheduler] Failed to save error to DB:`, dbError)
      }
    }

    // Schedule next check
    this.scheduleNextCheck(serviceId)
  }

  /**
   * Stop the scheduler
   */
  stop() {
    // Clear all scheduled timeouts
    for (const [serviceId, timeout] of this.scheduledChecks.entries()) {
      clearTimeout(timeout)
    }

    this.scheduledChecks.clear()
    this.isRunning = false

    logger.info('⏰ [Scheduler] Adaptive health check scheduler stopped')
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const states = Array.from(this.serviceStates.entries()).map(([serviceId, state]) => ({
      serviceId,
      currentInterval: `${state.currentInterval / 60000}min`,
      nextCheckAt: state.nextCheckAt.toISOString(),
      lastStatus: state.lastStatus,
      consecutiveSuccesses: state.consecutiveSuccesses,
      consecutiveFailures: state.consecutiveFailures,
    }))

    return {
      isRunning: this.isRunning,
      environment: process.env.NODE_ENV,
      totalServices: this.serviceStates.size,
      states,
    }
  }

  /**
   * Get current state for a specific service
   */
  getServiceState(serviceId: MonitoredServiceId): AdaptiveCheckState | undefined {
    return this.serviceStates.get(serviceId)
  }
}
