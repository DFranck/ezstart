/**
 * DELETE /api/ai/conversations/:id
 * Soft delete conversation
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

export const deleteConversationRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const deleteConversationRouter = createRouterWithDoc(
  deleteConversationRegistry,
  router,
  '/conversations'
)

deleteConversationRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const { id } = req.params

      // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
      const conversation = await AIConversation.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true }
      )

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      return sendSuccess(res, { message: 'Conversation deleted (soft)' })
    } catch (error) {
      logger.error('[AI Conversations] Soft delete error:', error)
      return sendError(res, 'Failed to delete conversation')
    }
  },
  {
    summary: 'Soft delete conversation',
    tags: ['AI Conversations'],
  }
)

export default router
