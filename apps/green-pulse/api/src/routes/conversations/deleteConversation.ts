/**
 * DELETE /api/conversations/:id
 * Soft delete conversation
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'

export const deleteConversationRegistry = new OpenAPIRegistry()
const router: any = Router()
export const deleteConversationRouter = createRouterWithDoc(
  deleteConversationRegistry,
  router,
  '/conversations'
)

deleteConversationRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const { id } = req.params

      // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
      const conversation = await Conversation.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true }
      )

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      return sendSuccess(res, { message: 'Conversation deleted (soft)' })
    } catch (error) {
      logger.error('Soft delete conversation error:', error)
      return sendError(res, 'Failed to delete conversation')
    }
  },
  {
    summary: 'Soft delete conversation',
    tags: ['Conversations'],
  }
)

export default router
