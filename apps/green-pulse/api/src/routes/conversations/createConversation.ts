/**
 * POST /api/conversations
 * Create new conversation
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'
import {
  CreateConversationSchema,
  ConversationSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const createConversationRegistry = new OpenAPIRegistry()
const router: any = Router()
export const createConversationRouter = createRouterWithDoc(
  createConversationRegistry,
  router,
  '/conversations'
)

createConversationRouter.post(
  '/',
  async (req, res) => {
    try {
      console.log('[POST /conversations] 🆕 Creating conversation, body:', req.body)
      const validation = CreateConversationSchema.safeParse(req.body)
      if (!validation.success) {
        console.log('[POST /conversations] ❌ Validation failed:', validation.error.errors)
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const { title, userId } = validation.data
      console.log('[POST /conversations] ✅ Validated data:', { title, userId })

      // @ts-expect-error - Mongoose create() type inference issue
      const conversation = await Conversation.create({
        title: title || 'New Chat',
        userId,
        messages: [],
      })

      console.log('[POST /conversations] ✅ Created conversation:', {
        _id: conversation._id.toString(),
        userId: conversation.userId,
        title: conversation.title,
      })

      res.json({
        success: true,
        data: {
          id: conversation._id.toString(),
          title: conversation.title,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Create conversation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create conversation',
        timestamp: new Date().toISOString(),
      })
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
