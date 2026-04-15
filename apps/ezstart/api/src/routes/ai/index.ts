/**
 * AI Feature Router — Centralized AI backend
 *
 * All routes scoped by appName to support multiple apps.
 *
 * Routes:
 * - POST   /api/ai/chat                           -> sendMessage (auth)
 * - POST   /api/ai/chat/stream                    -> streamMessage SSE (auth)
 * - GET    /api/ai/providers                       -> list providers (public)
 * - GET    /api/ai/conversations                   -> list conversations (auth)
 * - POST   /api/ai/conversations                   -> create conversation (auth)
 * - GET    /api/ai/conversations/:id               -> get conversation (auth)
 * - PATCH  /api/ai/conversations/:id               -> update conversation (auth)
 * - DELETE /api/ai/conversations/:id               -> soft delete (auth)
 * - DELETE /api/ai/conversations/:id/hard          -> hard delete (auth)
 * - POST   /api/ai/conversations/:id/restore       -> restore (auth)
 * - GET    /api/ai/prompts                          -> list prompts (auth)
 * - GET    /api/ai/prompts/:key                     -> get prompt (auth)
 * - POST   /api/ai/prompts                          -> create prompt (auth)
 * - PATCH  /api/ai/prompts/:key                     -> update prompt (auth)
 * - DELETE /api/ai/prompts/:key                     -> delete prompt (auth)
 */

import { Router, createRateLimiter } from '@ezstart/express-core'
import { optionalAuthMiddleware } from '../../middleware/auth.js'
import chatRouter from './chat/sendMessage.js'
import streamRouter from './chat/streamMessage.js'
import conversationsRouter from './conversations/index.js'
import promptsRouter from './prompts/index.js'
import providersRouter from './providers/index.js'
import appProvidersRouter from './app-providers/index.js'
import { globalProvidersRouter } from './global-providers/index.js'
import usageRouter from './usage/index.js'

const router: import('express').Router = Router()

// Chat — optional auth (anonymous users can chat, logged-in users get conversations saved)
// Stream route BEFORE chat to avoid /chat catching /chat/stream
// Chat routes keep their explicit prefix because their child routers use basePath '/' (no double-mount).
router.use(
  '/chat/stream',
  optionalAuthMiddleware,
  createRateLimiter({ windowMs: 60 * 1000, max: 30 }),
  streamRouter
)
router.use(
  '/chat',
  optionalAuthMiddleware,
  createRateLimiter({ windowMs: 60 * 1000, max: 30 }),
  chatRouter
)
// Sub-feature routers below own their basePath via createRouterWithDoc(..., '/<feature>'),
// so they are mounted at '/' here to avoid the historical double-mount that the
// pre-fix createRouterWithDoc silently swallowed.
router.use(conversationsRouter)
router.use(promptsRouter)
router.use(providersRouter)
router.use(appProvidersRouter)
router.use(globalProvidersRouter)
router.use(usageRouter)

export default router
