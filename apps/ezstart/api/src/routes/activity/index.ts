/**
 * Activity Routes
 *
 * Unified activity feed showing:
 * - Sentry errors
 * - Deployment events
 * - Health changes
 * - Audit updates
 */

import { Router } from '@ezstart/api-core'
import listRouter from './list.js'
import errorsRouter from './errors.js'
import statsRouter from './stats.js'

const router = Router()

// Mount action routes
router.use('/', listRouter)
router.use('/', errorsRouter)
router.use('/', statsRouter)

export default router as ReturnType<typeof Router>
