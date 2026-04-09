/**
 * AI Global Providers Feature Router
 *
 * All routes require authentication + superadmin role.
 * This is EZStart-level management — controls which apps can use which AI providers.
 *
 * Routes:
 * - GET    /api/ai/global-providers              -> list global provider configs
 * - POST   /api/ai/global-providers              -> create global provider config
 * - PATCH  /api/ai/global-providers/:id          -> update global provider config
 * - DELETE /api/ai/global-providers/:id          -> delete global provider config
 */

import { Router, createRoleMiddleware } from '@ezstart/express-core'
import { authMiddleware } from '../../../middleware/auth.js'

import listGlobalProvidersRouter, { listGlobalProvidersRegistry } from './listGlobalProviders.js'
import createGlobalProviderRouter, { createGlobalProviderRegistry } from './createGlobalProvider.js'
import updateGlobalProviderRouter, { updateGlobalProviderRegistry } from './updateGlobalProvider.js'
import deleteGlobalProviderRouter, { deleteGlobalProviderRegistry } from './deleteGlobalProvider.js'

const { requireRole } = createRoleMiddleware()
const requireSuperAdmin = requireRole('superadmin')

export const globalProvidersRegistries = [
  listGlobalProvidersRegistry,
  createGlobalProviderRegistry,
  updateGlobalProviderRegistry,
  deleteGlobalProviderRegistry,
]

const router: import('express').Router = Router()

// All global-provider routes require auth + superadmin
router.use(authMiddleware)
router.use(requireSuperAdmin)

router.use(listGlobalProvidersRouter)
router.use(createGlobalProviderRouter)
router.use(updateGlobalProviderRouter)
router.use(deleteGlobalProviderRouter)

export { router as globalProvidersRouter }
export default router
