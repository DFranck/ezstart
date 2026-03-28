/**
 * POST /api/conversations/:id/restore
 * Restore soft deleted conversation
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'

export const restoreConversationRegistry = new OpenAPIRegistry()
const router: any = Router()
export const restoreConversationRouter = createRouterWithDoc(
  restoreConversationRegistry,
  router,
  '/conversations'
)

restoreConversationRouter.post(
  '/:id/restore',
  async (req, res) => {
    try {
      const { id } = req.params

      // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
      const conversation = await Conversation.findByIdAndUpdate(
        id,
        { deletedAt: null },
        { new: true }
      )

      if (!conversation) {
        return sendError(res, 'Conversation not found', 404)
      }

      return sendSuccess(res, { message: 'Conversation restored' })
    } catch (error) {
      logger.error('Restore conversation error:', error)
      return sendError(res, 'Failed to restore conversation')
    }
  },
  {
    summary: 'Restore soft deleted conversation',
    tags: ['Conversations'],
  }
)

export default router
