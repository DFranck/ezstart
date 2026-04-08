/**
 * AI Conversations Feature Router
 *
 * All conversation routes require authentication and are scoped by appName.
 *
 * Routes:
 * - GET    /api/ai/conversations              -> listConversations
 * - POST   /api/ai/conversations              -> createConversation
 * - GET    /api/ai/conversations/:id          -> getConversationById
 * - PATCH  /api/ai/conversations/:id          -> updateConversation
 * - DELETE /api/ai/conversations/:id          -> deleteConversation (soft)
 * - DELETE /api/ai/conversations/:id/hard     -> hardDeleteConversation (permanent)
 * - POST   /api/ai/conversations/:id/restore  -> restoreConversation
 */

import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../../middleware/auth.js'

import listConversationsRouter, { listConversationsRegistry } from './listConversations.js'
import createConversationRouter, { createConversationRegistry } from './createConversation.js'
import getConversationByIdRouter, { getConversationByIdRegistry } from './getConversationById.js'
import updateConversationRouter, { updateConversationRegistry } from './updateConversation.js'
import deleteConversationRouter, { deleteConversationRegistry } from './deleteConversation.js'
import hardDeleteConversationRouter, {
  hardDeleteConversationRegistry,
} from './hardDeleteConversation.js'
import restoreConversationRouter, { restoreConversationRegistry } from './restoreConversation.js'

export const conversationRegistries = [
  listConversationsRegistry,
  createConversationRegistry,
  getConversationByIdRegistry,
  updateConversationRegistry,
  deleteConversationRegistry,
  hardDeleteConversationRegistry,
  restoreConversationRegistry,
]

const router: import('express').Router = Router()
router.use(authMiddleware)

router
  .use('/', listConversationsRouter)
  .use('/', createConversationRouter)
  .use('/', getConversationByIdRouter)
  .use('/', updateConversationRouter)
  .use('/', deleteConversationRouter)
  .use('/', hardDeleteConversationRouter)
  .use('/', restoreConversationRouter)

export default router
