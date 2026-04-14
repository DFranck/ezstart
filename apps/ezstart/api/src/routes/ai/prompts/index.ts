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

// This parent is mounted at /api/ai (no /prompts prefix) — children own '/prompts'
// basePath via createRouterWithDoc. Scope middlewares to '/prompts' so they don't
// leak to sibling AI features (chat, conversations, providers, etc.).
router.use('/prompts', authMiddleware)
router.use('/prompts', (req, res, next) => {
  // Apply admin requirement only on write methods (POST/PATCH/DELETE).
  if (req.method === 'GET') return next()
  return requireAdmin(req, res, next)
})

router.use(listPromptsRouter)
router.use(getPromptRouter)
router.use(createPromptRouter)
router.use(updatePromptRouter)
router.use(deletePromptRouter)

export default router
