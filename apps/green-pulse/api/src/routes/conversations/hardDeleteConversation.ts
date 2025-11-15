/**
 * DELETE /api/conversations/:id/hard
 * Hard delete conversation (permanent)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'

export const hardDeleteConversationRegistry = new OpenAPIRegistry()
const router: any = Router()
export const hardDeleteConversationRouter = createRouterWithDoc(
  hardDeleteConversationRegistry,
  router,
  '/conversations'
)

hardDeleteConversationRouter.delete(
  '/:id/hard',
  async (req, res) => {
    try {
      const { id } = req.params

      // @ts-expect-error - Mongoose findByIdAndDelete type inference issue
      const conversation = await Conversation.findByIdAndDelete(id)

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: { message: 'Conversation permanently deleted' },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Hard delete conversation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to permanently delete conversation',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Permanently delete conversation',
    tags: ['Conversations'],
  }
)

export default router
