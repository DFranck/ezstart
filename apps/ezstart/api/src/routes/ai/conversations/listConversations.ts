/**
 * GET /api/ai/conversations
 * List conversations scoped by appName
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
import { AIConversation } from '../../../models/AIConversation.js'

const listConversationsQuerySchema = z.object({
  appName: z.string().min(1).optional().describe('Application name (optional, omit for all apps)'),
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

      const { appName, userId, includeDeleted, limit, offset } = validation.data

      const query: Record<string, unknown> = {}
      if (appName) query.appName = appName
      if (userId) query.userId = userId
      if (!includeDeleted || includeDeleted === 'false') {
        query.deletedAt = null
      }

      const [conversations, total] = await Promise.all([
        AIConversation.find(query)
          .sort({ updatedAt: -1 })
          .skip(offset)
          .limit(limit)
          .select('_id appName title preview createdAt updatedAt')
          .lean()
          .exec() as Promise<Record<string, unknown>[]>,
        AIConversation.countDocuments(query),
      ])

      const list = conversations.map(conv => ({
        id: String(conv._id),
        appName: conv.appName as string,
        title: conv.title as string,
        preview: conv.preview as string,
        createdAt: conv.createdAt as string,
        updatedAt: conv.updatedAt as string,
        unread: false,
      }))

      return sendSuccess(res, { conversations: list }, { total, limit, offset })
    } catch (error) {
      logger.error('[AI Conversations] List error:', error)
      return sendError(res, 'Failed to list conversations')
    }
  },
  {
    summary: 'List conversations (scoped by appName)',
    tags: ['AI Conversations'],
  }
)

export default router
