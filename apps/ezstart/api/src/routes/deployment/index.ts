/**
 * Deployment Routes
 *
 * Routes for deployment configurations and status
 */

import { Router } from '@ezstart/api-core'
import listRouter, { registry as listRegistry } from './list.js'
import getByIdRouter, { registry as getByIdRegistry } from './get-by-id.js'

const router = Router()

// Mount action routes
router.use('/', listRouter)
router.use('/', getByIdRouter)

// Export combined registries
export const deploymentRegistries = [listRegistry, getByIdRegistry]

export default router as ReturnType<typeof Router>
