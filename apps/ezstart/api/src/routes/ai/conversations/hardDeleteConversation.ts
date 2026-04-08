/**
 * DELETE /api/ai/conversations/:id/hard
 * Hard delete conversation (permanent)
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { AIConversation } from '../../../models/AIConversation.js'

export const hardDeleteConversationRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const hardDeleteConversationRouter = createRouterWithDoc(
  hardDeleteConversationRegistry,
  router,
  '/conversations'
)

hardDeleteConversationRouter.delete(
  '/:id/hard',
  async (req, res) => {
    try {
      const { id } = req.params

      // @ts-expect-error - Mongoose findByIdAndDelete type inference issue
      const conversation = await AIConversation.findByIdAndDelete(id)

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      return sendSuccess(res, { message: 'Conversation permanently deleted' })
    } catch (error) {
      logger.error('[AI Conversations] Hard delete error:', error)
      return sendError(res, 'Failed to permanently delete conversation')
    }
  },
  {
    summary: 'Permanently delete conversation',
    tags: ['AI Conversations'],
  }
)

export default router
