/**
 * POST /api/conversations
 * Create new conversation
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
import { Conversation } from '../../models/Conversation.js'
import { CreateConversationSchema, ConversationSchema, ApiResponseSchema } from '@green-pulse/types'

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

      const { title, userId } = validation.data

      // @ts-expect-error - Mongoose create() type inference issue
      const conversation = await Conversation.create({
        title: title || 'New Chat',
        userId,
        messages: [],
      })

      return sendSuccess(res, {
        id: conversation._id.toString(),
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
    } catch (error) {
      logger.error('Create conversation error:', error)
      return sendError(res, 'Failed to create conversation')
    }
  },
  {
    summary: 'Create new conversation',
    tags: ['Conversations'],
    bodySchema: CreateConversationSchema,
    responseSchema: ApiResponseSchema(ConversationSchema),
  }
)

export default router
