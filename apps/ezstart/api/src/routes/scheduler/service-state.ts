/**
 * GET /api/scheduler/service/:serviceId
 *
 * Get adaptive state for a specific service
 */

import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import type { HealthCheckScheduler } from '../../services/healthCheckScheduler.js'
import type { MonitoredServiceId } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

let scheduler: HealthCheckScheduler | null = null

export function setScheduler(schedulerInstance: HealthCheckScheduler) {
  scheduler = schedulerInstance
}

const getServiceStateHandler = (req: Request, res: Response) => {
  if (!scheduler) {
    return sendError(res, 'Scheduler not initialized', 503)
  }

  const { serviceId } = req.params
  const state = scheduler.getServiceState(serviceId as MonitoredServiceId)

  if (!state) {
    return sendError(res, `Service ${serviceId} not found`, 404)
  }

  sendSuccess(res, {
    serviceId,
    currentInterval: `${state.currentInterval / 60000}min`,
    nextCheckAt: state.nextCheckAt.toISOString(),
    lastStatus: state.lastStatus,
    consecutiveSuccesses: state.consecutiveSuccesses,
    consecutiveFailures: state.consecutiveFailures,
  })
}

router.get('/service/:serviceId', getServiceStateHandler)

export default router as ReturnType<typeof Router>
