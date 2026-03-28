/**
 * GET /api/conversations
 * List all conversations (exclude soft deleted)
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'
import { ConversationListSchema, ApiResponseSchema } from '@green-pulse/types'

export const listConversationsRegistry = new OpenAPIRegistry()
const router: any = Router()
export const listConversationsRouter = createRouterWithDoc(
  listConversationsRegistry,
  router,
  '/conversations'
)

listConversationsRouter.get(
  '/',
  async (req, res) => {
    try {
      const { userId, includeDeleted, limit = 20, offset = 0 } = req.query

      const query: any = {}
      if (userId) query.userId = userId
      if (!includeDeleted || includeDeleted === 'false') {
        query.deletedAt = null
      }

      // @ts-expect-error - Mongoose find() type inference issue
      const [conversations, total] = await Promise.all([
        (Conversation.find(query)
          .sort({ updatedAt: -1 })
          .skip(Number(offset))
          .limit(Number(limit))
          .select('_id title preview createdAt updatedAt')
          .lean()
          .exec()) as Promise<any[]>,
        Conversation.countDocuments(query),
      ])

      const list = conversations.map(conv => ({
        id: conv._id.toString(),
        title: conv.title,
        preview: conv.preview,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        unread: false, // TODO: Implement unread logic
      }))

      return sendSuccess(res, { conversations: list }, { total, limit: Number(limit), offset: Number(offset) })
    } catch (error) {
      logger.error('List conversations error:', error)
      return sendError(res, 'Failed to list conversations')
    }
  },
  {
    summary: 'List all conversations',
    tags: ['Conversations'],
    responseSchema: ApiResponseSchema(ConversationListSchema.array()),
  }
)

export default router
