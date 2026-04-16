/**
 * Performance Routes
 *
 * Routes for performance metrics tracking
 */

import { Router } from '@ezstart/api-core'
import recordRouter from './record.js'
import getByServiceRouter from './get-by-service.js'
import endpointsRouter from './endpoints.js'

const router = Router()

// Mount action routes
router.use('/', recordRouter)
router.use('/', getByServiceRouter)
router.use('/', endpointsRouter)

export default router as ReturnType<typeof Router>
