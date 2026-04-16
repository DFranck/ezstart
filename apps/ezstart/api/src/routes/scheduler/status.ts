/**
 * GET /api/scheduler/status
 *
 * Get adaptive scheduler status with current intervals for all services
 */

import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import type { HealthCheckScheduler } from '../../services/healthCheckScheduler.js'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

let scheduler: HealthCheckScheduler | null = null

export function setScheduler(schedulerInstance: HealthCheckScheduler) {
  scheduler = schedulerInstance
}

const getStatusHandler = (req: Request, res: Response) => {
  if (!scheduler) {
    return sendError(res, 'Scheduler not initialized', 503)
  }

  const status = scheduler.getStatus()
  sendSuccess(res, status)
}

router.get('/status', getStatusHandler)

export default router as ReturnType<typeof Router>
