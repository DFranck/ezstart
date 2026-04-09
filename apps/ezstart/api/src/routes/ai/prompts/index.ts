/**
 * AI Prompts Feature Router
 *
 * All prompt routes require authentication (admin CRUD).
 * All routes are scoped by appName.
 *
 * Routes:
 * - GET    /api/ai/prompts           -> list prompts
 * - GET    /api/ai/prompts/:key      -> get prompt by key
 * - POST   /api/ai/prompts           -> create prompt
 * - PATCH  /api/ai/prompts/:key      -> update prompt
 * - DELETE /api/ai/prompts/:key      -> delete prompt
 */

import { Router, createRoleMiddleware } from '@ezstart/express-core'
import { authMiddleware } from '../../../middleware/auth.js'

import listPromptsRouter, { listPromptsRegistry } from './list.js'
import getPromptRouter, { getPromptRegistry } from './get.js'
import createPromptRouter, { createPromptRegistry } from './create.js'
import updatePromptRouter, { updatePromptRegistry } from './update.js'
import deletePromptRouter, { deletePromptRegistry } from './delete.js'

const { requireAdmin } = createRoleMiddleware()

export const promptsRegistries = [
  listPromptsRegistry,
  getPromptRegistry,
  createPromptRegistry,
  updatePromptRegistry,
  deletePromptRegistry,
]

const router: import('express').Router = Router()

// All prompt routes require auth
router.use(authMiddleware)

// Read routes — auth only (any authenticated user can list/get prompts)
router.use(listPromptsRouter)
router.use(getPromptRouter)

// Write routes — admin only (create/update/delete prompts)
const adminRouter: import('express').Router = Router()
adminRouter.use(requireAdmin)
adminRouter.use(createPromptRouter)
adminRouter.use(updatePromptRouter)
adminRouter.use(deletePromptRouter)
router.use(adminRouter)

export default router
