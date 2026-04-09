/**
 * DELETE /api/ai/conversations/:id
 * Soft delete conversation
 */

import { logger } from '@ezstart/logger/server'
import mongoose from 'mongoose'
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

      if (!mongoose.isValidObjectId(id)) {
        return sendError(res, 'Invalid conversation ID format', 400)
      }

      // Ownership check before delete
      const existing = await AIConversation.findById(id).lean().exec()
      if (!existing) {
        return sendError(res, 'Conversation not found', 404)
      }
      if (existing.userId && existing.userId !== req.userId) {
        return sendError(res, 'Forbidden — not conversation owner', 403)
      }

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
