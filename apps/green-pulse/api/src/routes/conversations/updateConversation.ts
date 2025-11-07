/**
 * PATCH /api/conversations/:id
 * Update conversation (rename)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { Conversation } from '../../models/Conversation.js'
import {
  UpdateConversationSchema,
  ConversationSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const updateConversationRegistry = new OpenAPIRegistry()
const router: any = Router()
export const updateConversationRouter = createRouterWithDoc(
  updateConversationRegistry,
  router,
  '/:id'
)

updateConversationRouter.patch(
  '/',
  async (req, res) => {
    try {
      const { id } = req.params
      const validation = UpdateConversationSchema.safeParse(req.body)

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const { title } = validation.data

      // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
      const conversation = await Conversation.findByIdAndUpdate(
        id,
        { title },
        { new: true, runValidators: true }
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
        data: {
          id: conversation._id.toString(),
          title: conversation.title,
          updatedAt: conversation.updatedAt,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Update conversation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update conversation',
        timestamp: new Date().toISOString(),
      })
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
