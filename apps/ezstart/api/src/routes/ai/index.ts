/**
 * AI Feature Router — Centralized AI backend
 *
 * All routes scoped by appName to support multiple apps.
 *
 * Routes:
 * - POST   /api/ai/chat                           -> sendMessage (public)
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

import { Router } from '@ezstart/express-core'
import chatRouter from './chat/sendMessage.js'
import conversationsRouter from './conversations/index.js'
import promptsRouter from './prompts/index.js'
import providersRouter from './providers/index.js'

const router: import('express').Router = Router()

router.use('/chat', chatRouter)
router.use('/conversations', conversationsRouter)
router.use('/prompts', promptsRouter)
router.use('/providers', providersRouter)

export default router
