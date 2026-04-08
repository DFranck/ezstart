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

import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../../middleware/auth.js'

import listPromptsRouter, { listPromptsRegistry } from './list.js'
import getPromptRouter, { getPromptRegistry } from './get.js'
import createPromptRouter, { createPromptRegistry } from './create.js'
import updatePromptRouter, { updatePromptRegistry } from './update.js'
import deletePromptRouter, { deletePromptRegistry } from './delete.js'

export const promptsRegistries = [
  listPromptsRegistry,
  getPromptRegistry,
  createPromptRegistry,
  updatePromptRegistry,
  deletePromptRegistry,
]

const router: import('express').Router = Router()
router.use(authMiddleware)

router.use(listPromptsRouter)
router.use(getPromptRouter)
router.use(createPromptRouter)
router.use(updatePromptRouter)
router.use(deletePromptRouter)

export default router
