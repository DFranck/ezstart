/**
 * AI App Providers Feature Router
 *
 * All routes require authentication.
 * Write operations (create/update/delete/toggle) require admin role.
 *
 * Routes:
 * - GET    /api/ai/app-providers              -> list app providers
 * - POST   /api/ai/app-providers              -> create app provider
 * - PATCH  /api/ai/app-providers/:id          -> update app provider
 * - DELETE /api/ai/app-providers/:id          -> delete app provider
 * - PATCH  /api/ai/app-providers/:id/toggle   -> toggle enabled/disabled
 */

import { Router, createRoleMiddleware } from '@ezstart/express-core'
import { authMiddleware } from '../../../middleware/auth.js'

import listAppProvidersRouter, { listAppProvidersRegistry } from './listAppProviders.js'
import createAppProviderRouter, { createAppProviderRegistry } from './createAppProvider.js'
import updateAppProviderRouter, { updateAppProviderRegistry } from './updateAppProvider.js'
import deleteAppProviderRouter, { deleteAppProviderRegistry } from './deleteAppProvider.js'
import toggleAppProviderRouter, { toggleAppProviderRegistry } from './toggleAppProvider.js'

const { requireAdmin } = createRoleMiddleware()

export const appProvidersRegistries = [
  listAppProvidersRegistry,
  createAppProviderRegistry,
  updateAppProviderRegistry,
  deleteAppProviderRegistry,
  toggleAppProviderRegistry,
]

const router: import('express').Router = Router()

// All app-provider routes require auth
router.use(authMiddleware)

// Read routes — any authenticated user
router.use(listAppProvidersRouter)

// Write routes — admin only
const adminRouter: import('express').Router = Router()
adminRouter.use(requireAdmin)
adminRouter.use(createAppProviderRouter)
adminRouter.use(updateAppProviderRouter)
adminRouter.use(deleteAppProviderRouter)
adminRouter.use(toggleAppProviderRouter)
router.use(adminRouter)

export default router
