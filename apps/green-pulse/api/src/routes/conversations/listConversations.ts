/**
 * GET /api/conversations
 * List all conversations (exclude soft deleted)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'
import { ConversationListSchema, ApiResponseSchema } from '@green-pulse/types'

export const listConversationsRegistry = new OpenAPIRegistry()
const router: any = Router()
export const listConversationsRouter = createRouterWithDoc(
  listConversationsRegistry,
  router,
  '/'
)

listConversationsRouter.get(
  '/',
  async (req, res) => {
    try {
      const { userId, includeDeleted } = req.query

      const query: any = {}
      if (userId) query.userId = userId
      if (!includeDeleted || includeDeleted === 'false') {
        query.deletedAt = null
      }

      // @ts-expect-error - Mongoose find() type inference issue
      const conversations = (await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .select('_id title preview createdAt updatedAt')
        .lean()
        .exec()) as any[]

      const list = conversations.map(conv => ({
        id: conv._id.toString(),
        title: conv.title,
        preview: conv.preview,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        unread: false, // TODO: Implement unread logic
      }))

      res.json({
        success: true,
        data: { conversations: list },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('List conversations error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to list conversations',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'List all conversations',
    tags: ['Conversations'],
    responseSchema: ApiResponseSchema(ConversationListSchema.array()),
  }
)

export default router
