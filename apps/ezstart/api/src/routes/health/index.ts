/**
 * Health Check Routes
 *
 * Routes for service health monitoring
 */

import { Router } from '@ezstart/express-core'
import listRouter, { registry as listRegistry } from './list.js'
import getByServiceRouter, { registry as getByServiceRegistry } from './get-by-service.js'
import projectHistoryRouter, { registry as projectHistoryRegistry } from './project-history.js'
import historyRouter, { registry as historyRegistry } from './history.js'

const router = Router()

// Mount action routes
// ⚠️ projectHistoryRouter MUST be before historyRouter
// otherwise Express matches "history" as :serviceId in /:serviceId/history
router.use('/', listRouter)
router.use('/', getByServiceRouter)
router.use('/', projectHistoryRouter)
router.use('/', historyRouter)

// Export combined registries
export const healthRegistries = [
  listRegistry,
  getByServiceRegistry,
  projectHistoryRegistry,
  historyRegistry,
]

export default router as ReturnType<typeof Router>
