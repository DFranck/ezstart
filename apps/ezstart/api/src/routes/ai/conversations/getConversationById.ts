/**
 * GET /api/ai/conversations/:id
 * Get conversation with messages
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

export const getConversationByIdRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const getConversationByIdRouter = createRouterWithDoc(
  getConversationByIdRegistry,
  router,
  '/conversations'
)

getConversationByIdRouter.get(
  '/:id',
  async (req, res) => {
    try {
      const { id } = req.params

      if (!mongoose.isValidObjectId(id)) {
        return sendError(res, 'Invalid conversation ID format', 400)
      }

      const conversation = await AIConversation.findById(id).lean().exec()

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      // Ownership check — only owner or superadmin can access
      if (conversation.userId && conversation.userId !== req.userId) {
        return sendError(res, 'Forbidden — not conversation owner', 403)
      }

      if (conversation.deletedAt) {
        return sendError(res, 'Conversation was deleted', 410)
      }

      return sendSuccess(res, {
        id: conversation._id.toString(),
        appName: conversation.appName,
        title: conversation.title,
        preview: conversation.preview,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
    } catch (error) {
      logger.error('[AI Conversations] Get by ID error:', error)
      return sendError(res, 'Failed to get conversation')
    }
  },
  {
    summary: 'Get conversation by ID',
    tags: ['AI Conversations'],
  }
)

export default router
