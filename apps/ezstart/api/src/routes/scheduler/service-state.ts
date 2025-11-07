/**
 * GET /api/scheduler/service/:serviceId
 *
 * Get adaptive state for a specific service
 */

import { Router } from '@ezstart/express-core'
import type { HealthCheckScheduler } from '../../services/healthCheckScheduler.js'
import type { Request, Response } from 'express'

export const router = Router()

let scheduler: HealthCheckScheduler | null = null

export function setScheduler(schedulerInstance: HealthCheckScheduler) {
  scheduler = schedulerInstance
}

const getServiceStateHandler = (req: Request, res: Response) => {
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
}

router.get('/service/:serviceId', getServiceStateHandler)

export default router as ReturnType<typeof Router>
