/**
 * POST /api/ai/conversations
 * Create new conversation scoped by appName
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

const CreateConversationSchema = z.object({
  appName: z.string().min(1).max(50).describe('Application name (required)'),
  title: z.string().max(100).optional().describe('Conversation title'),
  userId: z.string().optional().describe('User ID for ownership'),
})

export const createConversationRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const createConversationRouter = createRouterWithDoc(
  createConversationRegistry,
  router,
  '/conversations'
)

createConversationRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreateConversationSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const { appName, title, userId } = validation.data

      // @ts-expect-error - Mongoose create() type inference issue
      const conversation = await AIConversation.create({
        appName,
        title: title || 'New Chat',
        userId,
        messages: [],
      })

      return sendSuccess(res, {
        id: conversation._id.toString(),
        appName: conversation.appName,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
    } catch (error) {
      logger.error('[AI Conversations] Create error:', error)
      return sendError(res, 'Failed to create conversation')
    }
  },
  {
    summary: 'Create new conversation (scoped by appName)',
    tags: ['AI Conversations'],
    bodySchema: CreateConversationSchema,
  }
)

export default router
