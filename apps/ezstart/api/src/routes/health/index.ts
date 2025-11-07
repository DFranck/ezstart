/**
 * Health Check Routes
 *
 * Routes for service health monitoring
 */

import { Router } from '@ezstart/express-core'
import listRouter, { registry as listRegistry } from './list.js'
import getByServiceRouter, { registry as getByServiceRegistry } from './get-by-service.js'
import historyRouter, { registry as historyRegistry } from './history.js'

const router = Router()

// Mount action routes
router.use('/', listRouter)
router.use('/', getByServiceRouter)
router.use('/', historyRouter)

// Export combined registries
export const healthRegistries = [listRegistry, getByServiceRegistry, historyRegistry]

export default router as ReturnType<typeof Router>
