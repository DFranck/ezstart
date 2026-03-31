/**
 * Conversations Feature Router
 *
 * Consolidates all conversation-related actions into a single router.
 * Each action is defined in its own file following the action-based routing pattern.
 *
 * Routes:
 * - GET    /api/conversations              -> listConversations
 * - POST   /api/conversations              -> createConversation
 * - GET    /api/conversations/:id          -> getConversationById
 * - PATCH  /api/conversations/:id          -> updateConversation
 * - DELETE /api/conversations/:id          -> deleteConversation (soft)
 * - DELETE /api/conversations/:id/hard     -> hardDeleteConversation (permanent)
 * - POST   /api/conversations/:id/restore  -> restoreConversation
 */

import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../middleware/auth.js'

// Import individual action routers
import listConversationsRouter, { listConversationsRegistry } from './listConversations.js'
import createConversationRouter, { createConversationRegistry } from './createConversation.js'
import getConversationByIdRouter, { getConversationByIdRegistry } from './getConversationById.js'
import updateConversationRouter, { updateConversationRegistry } from './updateConversation.js'
import deleteConversationRouter, { deleteConversationRegistry } from './deleteConversation.js'
import hardDeleteConversationRouter, {
  hardDeleteConversationRegistry,
} from './hardDeleteConversation.js'
import restoreConversationRouter, { restoreConversationRegistry } from './restoreConversation.js'

// Export all registries as an array for OpenAPI documentation
export const conversationRegistries = [
  listConversationsRegistry,
  createConversationRegistry,
  getConversationByIdRegistry,
  updateConversationRegistry,
  deleteConversationRegistry,
  hardDeleteConversationRegistry,
  restoreConversationRegistry,
]

// Consolidate all action routers — all conversation routes require authentication
const router: import('express').Router = Router()
router.use(authMiddleware)

router
  .use('/', listConversationsRouter) // GET /
  .use('/', createConversationRouter) // POST /
  .use('/', getConversationByIdRouter) // GET /:id
  .use('/', updateConversationRouter) // PATCH /:id
  .use('/', deleteConversationRouter) // DELETE /:id
  .use('/', hardDeleteConversationRouter) // DELETE /:id/hard
  .use('/', restoreConversationRouter) // POST /:id/restore

export default router
