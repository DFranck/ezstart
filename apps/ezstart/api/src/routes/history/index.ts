/**
 * History Routes
 *
 * Routes for health check history data
 */

import { Router } from '@ezstart/api-core'
import aggregateRouter from './aggregate.js'
import byProjectRouter from './by-project.js'
import byServiceRouter from './by-service.js'

const router = Router()

// IMPORTANT: Static routes (/aggregate, /project/:projectId) MUST be mounted
// BEFORE /:serviceId — Express matches routes in order.
router.use('/', aggregateRouter)
router.use('/', byProjectRouter)
router.use('/', byServiceRouter)

export default router as ReturnType<typeof Router>
