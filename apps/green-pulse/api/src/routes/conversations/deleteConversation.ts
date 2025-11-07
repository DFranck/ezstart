/**
 * DELETE /api/conversations/:id
 * Soft delete conversation
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'

export const deleteConversationRegistry = new OpenAPIRegistry()
const router: any = Router()
export const deleteConversationRouter = createRouterWithDoc(
  deleteConversationRegistry,
  router,
  '/:id'
)

deleteConversationRouter.delete(
  '/',
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
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: { message: 'Conversation deleted (soft)' },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Soft delete conversation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete conversation',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Soft delete conversation',
    tags: ['Conversations'],
  }
)

export default router
