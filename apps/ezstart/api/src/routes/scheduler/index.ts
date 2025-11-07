/**
 * Scheduler Routes
 *
 * Routes for adaptive health check scheduler status
 */

import { Router } from '@ezstart/express-core'
import statusRouter, { setScheduler as setSchedulerStatus } from './status.js'
import serviceStateRouter, { setScheduler as setSchedulerServiceState } from './service-state.js'
import type { HealthCheckScheduler } from '../../services/healthCheckScheduler.js'

const router = Router()

// Mount action routes
router.use('/', statusRouter)
router.use('/', serviceStateRouter)

// Export setScheduler function that updates both routers
export function setScheduler(schedulerInstance: HealthCheckScheduler) {
  setSchedulerStatus(schedulerInstance)
  setSchedulerServiceState(schedulerInstance)
}

export default router as ReturnType<typeof Router>
