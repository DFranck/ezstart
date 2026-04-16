/**
 * Projects Routes
 *
 * Routes for project-grouped health checks
 */

import { Router } from '@ezstart/api-core'
import listRouter from './list.js'
import getByIdRouter from './get-by-id.js'

const router = Router()

// Mount action routes
router.use('/', listRouter)
router.use('/', getByIdRouter)

export default router as ReturnType<typeof Router>
