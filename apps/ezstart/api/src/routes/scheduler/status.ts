/**
 * GET /api/scheduler/status
 *
 * Get adaptive scheduler status with current intervals for all services
 */

import { Router } from '@ezstart/express-core'
import type { HealthCheckScheduler } from '../../services/healthCheckScheduler.js'
import type { Request, Response } from 'express'

export const router = Router()

let scheduler: HealthCheckScheduler | null = null

export function setScheduler(schedulerInstance: HealthCheckScheduler) {
  scheduler = schedulerInstance
}

const getStatusHandler = (req: Request, res: Response) => {
  if (!scheduler) {
    return res.status(503).json({
      error: 'Scheduler not initialized',
      isRunning: false,
    })
  }

  const status = scheduler.getStatus()
  res.json(status)
}

router.get('/status', getStatusHandler)

export default router as ReturnType<typeof Router>
