/**
 * History Routes
 *
 * Routes for health check history data
 */

import { Router } from '@ezstart/api-core'
import byProjectRouter from './by-project.js'
import byServiceRouter from './by-service.js'

const router = Router()

// IMPORTANT: Mount /project/:projectId BEFORE /:serviceId
// Express matches routes in order
router.use('/', byProjectRouter)
router.use('/', byServiceRouter)

export default router as ReturnType<typeof Router>
