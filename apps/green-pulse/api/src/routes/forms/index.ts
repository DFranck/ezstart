/**
 * Forms Feature Router
 *
 * Consolidates all form-related actions into a single router.
 * Organized by sub-features: configs, instances, and AI extraction.
 *
 * Routes:
 * - GET    /api/forms/configs              -> listFormConfigs
 * - GET    /api/forms/configs/:id          -> getFormConfigById
 * - POST   /api/forms/configs              -> createFormConfig
 * - GET    /api/forms/instances            -> listFormInstances
 * - GET    /api/forms/instances/:id        -> getFormInstanceById
 * - POST   /api/forms/instances            -> createFormInstance
 * - PUT    /api/forms/instances/:id        -> updateFormInstance
 * - POST   /api/forms/instances/:id/submit -> submitFormInstance
 * - DELETE /api/forms/instances/:id        -> deleteFormInstance
 * - POST   /api/forms/extract              -> extractFormData (AI)
 */

import { Router } from '@ezstart/express-core'

// Import sub-feature routers
import formConfigsRouter, { formConfigRegistries } from './configs/index.js'
import formInstancesRouter, { formInstanceRegistries } from './instances/index.js'
import extractFormDataRouter, { extractFormDataRegistry } from './extractFormData.js'

// Export all registries as an array for OpenAPI documentation
export const formRegistries = [
  ...formConfigRegistries,
  ...formInstanceRegistries,
  extractFormDataRegistry,
]

// Consolidate all form routers
const router: any = Router()

router
  .use('/', formConfigsRouter)      // /configs/*
  .use('/', formInstancesRouter)    // /instances/*
  .use('/', extractFormDataRouter)  // /extract

export default router
