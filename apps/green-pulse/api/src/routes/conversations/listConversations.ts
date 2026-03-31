/**
 * GET /api/conversations
 * List all conversations (exclude soft deleted)
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { Conversation } from '../../models/Conversation.js'
import { ConversationListSchema, ApiResponseSchema } from '@green-pulse/types'

const listConversationsQuerySchema = z.object({
  userId: z.string().optional().describe('Filter by user ID'),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .describe('Include soft-deleted conversations'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Maximum items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const listConversationsRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const listConversationsRouter = createRouterWithDoc(
  listConversationsRegistry,
  router,
  '/conversations'
)

listConversationsRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listConversationsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { userId, includeDeleted, limit, offset } = validation.data

      const query: Record<string, unknown> = {}
      if (userId) query.userId = userId
      if (!includeDeleted || includeDeleted === 'false') {
        query.deletedAt = null
      }

      const [conversations, total] = await Promise.all([
        // @ts-expect-error - Mongoose type inference issue with dynamic query
        Conversation.find(query)
          .sort({ updatedAt: -1 })
          .skip(offset)
          .limit(limit)
          .select('_id title preview createdAt updatedAt')
          .lean()
          .exec() as Promise<Record<string, unknown>[]>,
        Conversation.countDocuments(query),
      ])

      const list = conversations.map(conv => ({
        id: String(conv._id),
        title: conv.title as string,
        preview: conv.preview as string,
        createdAt: conv.createdAt as string,
        updatedAt: conv.updatedAt as string,
        unread: false, // TODO: Implement unread logic
      }))

      return sendSuccess(res, { conversations: list }, { total, limit, offset })
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
