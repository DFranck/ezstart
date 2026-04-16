/**
 * Metrics Routes
 *
 * Routes for monitoring metrics
 */

import { Router } from '@ezstart/api-core'
import rootRouter, { registry as rootRegistry } from './root.js'
import dashboardRouter, { registry as dashboardRegistry } from './dashboard.js'

const router = Router()

// Mount action routes
router.use('/', rootRouter)
router.use('/', dashboardRouter)

// Export combined registries
export const metricsRegistries = [rootRegistry, dashboardRegistry]

export default router as ReturnType<typeof Router>
