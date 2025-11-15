/**
 * POST /api/conversations/:id/restore
 * Restore soft deleted conversation
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
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
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: { message: 'Conversation restored' },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Restore conversation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to restore conversation',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Restore soft deleted conversation',
    tags: ['Conversations'],
  }
)

export default router
