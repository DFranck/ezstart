/**
 * POST /api/ai/conversations/:id/restore
 * Restore soft deleted conversation
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

export const restoreConversationRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const restoreConversationRouter = createRouterWithDoc(
  restoreConversationRegistry,
  router,
  '/conversations'
)

restoreConversationRouter.post(
  '/:id/restore',
  async (req, res) => {
    try {
      const { id } = req.params

      if (!mongoose.isValidObjectId(id)) {
        return sendError(res, 'Invalid conversation ID format', 400)
      }

      // Ownership check before restore
      const existing = await AIConversation.findById(id).lean().exec()
      if (!existing) {
        return sendError(res, 'Conversation not found', 404)
      }
      if (existing.userId && existing.userId !== req.userId) {
        return sendError(res, 'Forbidden — not conversation owner', 403)
      }

      const conversation = await AIConversation.findByIdAndUpdate(
        id,
        { deletedAt: null },
        { new: true }
      )

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      return sendSuccess(res, { message: 'Conversation restored' })
    } catch (error) {
      logger.error('[AI Conversations] Restore error:', error)
      return sendError(res, 'Failed to restore conversation')
    }
  },
  {
    summary: 'Restore soft deleted conversation',
    tags: ['AI Conversations'],
  }
)

export default router
