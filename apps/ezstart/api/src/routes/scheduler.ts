/**
 * Scheduler status routes
 * Get current state of adaptive health check scheduler
 */

import { Router } from '@ezstart/express-core'
import type { HealthCheckScheduler } from '../services/healthCheckScheduler.js'

let scheduler: HealthCheckScheduler | null = null

export function setScheduler(schedulerInstance: HealthCheckScheduler) {
  scheduler = schedulerInstance
}

export const schedulerRoutes: ReturnType<typeof Router> = Router()

/**
 * GET /api/scheduler/status
 * Get adaptive scheduler status with current intervals for all services
 */
schedulerRoutes.get('/status', (req, res) => {
  if (!scheduler) {
    return res.status(503).json({
      error: 'Scheduler not initialized',
      isRunning: false,
    })
  }

  const status = scheduler.getStatus()
  res.json(status)
})

/**
 * GET /api/scheduler/service/:serviceId
 * Get adaptive state for a specific service
 */
schedulerRoutes.get('/service/:serviceId', (req, res) => {
  if (!scheduler) {
    return res.status(503).json({
      error: 'Scheduler not initialized',
    })
  }

  const { serviceId } = req.params
  const state = scheduler.getServiceState(serviceId as any)

  if (!state) {
    return res.status(404).json({
      error: `Service ${serviceId} not found`,
    })
  }

  res.json({
    serviceId,
    currentInterval: `${state.currentInterval / 60000}min`,
    nextCheckAt: state.nextCheckAt.toISOString(),
    lastStatus: state.lastStatus,
    consecutiveSuccesses: state.consecutiveSuccesses,
    consecutiveFailures: state.consecutiveFailures,
  })
})
