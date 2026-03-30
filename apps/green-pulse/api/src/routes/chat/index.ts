/**
 * Chat Feature Router
 *
 * Consolidates all chat-related actions into a single router.
 * Each action is defined in its own file following the action-based routing pattern.
 *
 * Routes:
 * - POST /api/chat              -> sendMessage (with optional ESG extraction)
 * - POST /api/chat/extract      -> extractEsgData (direct ESG extraction)
 */

import { Router } from '@ezstart/express-core'

// Import individual action routers
import sendMessageRouter, { sendMessageRegistry } from './sendMessage.js'
import extractEsgDataRouter, { extractEsgDataRegistry } from './extractEsgData.js'

// Export all registries as an array for OpenAPI documentation
export const chatRegistries = [sendMessageRegistry, extractEsgDataRegistry]

// Consolidate all action routers
const router: import('express').Router = Router()

router
  .use('/', sendMessageRouter) // POST /
  .use('/extract', extractEsgDataRouter) // POST /extract

export default router
