/**
 * PATCH /api/conversations/:id
 * Update conversation (rename)
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
import { UpdateConversationSchema, ConversationSchema, ApiResponseSchema } from '@green-pulse/types'

export const updateConversationRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const updateConversationRouter = createRouterWithDoc(
  updateConversationRegistry,
  router,
  '/conversations'
)

updateConversationRouter.patch(
  '/:id',
  async (req, res) => {
    try {
      const { id } = req.params
      const validation = UpdateConversationSchema.safeParse(req.body)

      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const { title } = validation.data

      // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
      const conversation = await Conversation.findByIdAndUpdate(
        id,
        { title },
        { new: true, runValidators: true }
      )

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      return sendSuccess(res, {
        id: conversation._id.toString(),
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      })
    } catch (error) {
      logger.error('Update conversation error:', error)
      return sendError(res, 'Failed to update conversation')
    }
  },
  {
    summary: 'Update conversation (rename)',
    tags: ['Conversations'],
    bodySchema: UpdateConversationSchema,
    responseSchema: ApiResponseSchema(ConversationSchema),
  }
)

export default router
