/**
 * GET /api/conversations/:id
 * Get conversation with messages
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'
import { ConversationSchema, ApiResponseSchema } from '@green-pulse/types'

export const getConversationByIdRegistry = new OpenAPIRegistry()
const router: any = Router()
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

      // @ts-expect-error - Mongoose findById type inference issue
      const conversation = await Conversation.findById(id).lean().exec()

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      if (conversation.deletedAt) {
        return sendError(res, 'Conversation was deleted', 410)
      }

      return sendSuccess(res, {
        id: conversation._id.toString(),
        title: conversation.title,
        preview: conversation.preview,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
    } catch (error) {
      logger.error('Get conversation error:', error)
      return sendError(res, 'Failed to get conversation')
    }
  },
  {
    summary: 'Get conversation by ID',
    tags: ['Conversations'],
    responseSchema: ApiResponseSchema(ConversationSchema),
  }
)

export default router
