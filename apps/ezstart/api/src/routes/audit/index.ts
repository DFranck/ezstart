/**
 * Audit Routes
 *
 * Routes for fetching audit information and scores
 */

import { Router } from '@ezstart/express-core'
import listRouter, { registry as listRegistry } from './list.js'
import getByTypeRouter, { registry as getByTypeRegistry } from './get-by-type.js'

const router = Router()

// Mount action routes
router.use('/', listRouter)
router.use('/', getByTypeRouter)

// Export combined registries
export const auditRegistries = [listRegistry, getByTypeRegistry]

export default router as ReturnType<typeof Router>
