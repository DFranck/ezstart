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

import { Router, createRoleMiddleware } from '@ezstart/api-core'
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

// This parent is mounted at /api/ai (no /app-providers prefix) — children own
// '/app-providers' basePath via createRouterWithDoc. Scope middlewares to
// '/app-providers' so they don't leak to sibling AI features.
router.use('/app-providers', authMiddleware)
router.use('/app-providers', (req, res, next) => {
  // Read routes (GET) only require auth; write routes require admin.
  if (req.method === 'GET') return next()
  return requireAdmin(req, res, next)
})

router.use(listAppProvidersRouter)
router.use(createAppProviderRouter)
router.use(updateAppProviderRouter)
router.use(deleteAppProviderRouter)
router.use(toggleAppProviderRouter)

export default router
