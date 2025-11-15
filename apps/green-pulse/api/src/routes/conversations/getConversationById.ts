/**
 * GET /api/conversations/:id
 * Get conversation with messages
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
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
      console.log('[GET /conversations/:id] 🔍 Fetching conversation:', id)

      // @ts-expect-error - Mongoose findById type inference issue
      const conversation = await Conversation.findById(id).lean().exec()

      if (!conversation) {
        console.log('[GET /conversations/:id] ❌ Conversation not found:', id)
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          timestamp: new Date().toISOString(),
        })
      }
      console.log('[GET /conversations/:id] ✅ Conversation found:', conversation._id)

      if (conversation.deletedAt) {
        return res.status(410).json({
          success: false,
          error: 'Conversation was deleted',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: {
          id: conversation._id.toString(),
          title: conversation.title,
          preview: conversation.preview,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Get conversation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get conversation by ID',
    tags: ['Conversations'],
    responseSchema: ApiResponseSchema(ConversationSchema),
  }
)

export default router
