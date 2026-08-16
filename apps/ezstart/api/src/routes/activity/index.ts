/**
 * Activity Routes
 *
 * Unified activity feed showing:
 * - Deployment events
 * - Health changes
 * - Audit updates
 *
 * (Sentry errors source removed 2026-04-25 — see logger README.)
 */

import { Router } from '@ezstart/api-core'
import listRouter from './list.js'
import statsRouter from './stats.js'

const router = Router()

// Mount action routes
router.use('/', listRouter)
router.use('/', statsRouter)

export default router as ReturnType<typeof Router>
