/**
 * DELETE /api/ai/conversations/:id/hard
 * Hard delete conversation (permanent)
 */

import { logger } from '@ezstart/logger/server'
import mongoose from 'mongoose'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
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

      if (!mongoose.isValidObjectId(id)) {
        return sendError(res, 'Invalid conversation ID format', 400)
      }

      // Ownership check before hard delete
      const existing = await AIConversation.findById(id).lean().exec()
      if (!existing) {
        return sendError(res, 'Conversation not found', 404)
      }
      if (existing.userId && existing.userId !== req.userId) {
        return sendError(res, 'Forbidden — not conversation owner', 403)
      }

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
