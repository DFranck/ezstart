import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { Conversation } from '../models/Conversation.js'
import {
  CreateConversationSchema,
  UpdateConversationSchema,
  ConversationSchema,
  ConversationListSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const conversationRegistry = new OpenAPIRegistry()
const router: any = Router()
const docRouter = createRouterWithDoc(conversationRegistry, router, '/conversations')

/**
 * GET /api/conversations
 * List all conversations (exclude soft deleted)
 */
docRouter.get(
  '/',
  async (req, res) => {
    try {
      const { userId, includeDeleted } = req.query

      const query: any = {}
      if (userId) query.userId = userId
      if (!includeDeleted || includeDeleted === 'false') {
        query.deletedAt = null
      }

      // @ts-expect-error - Mongoose find() type inference issue
      const conversations = (await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .select('_id title preview createdAt updatedAt')
        .lean()
        .exec()) as any[]

      const list = conversations.map(conv => ({
        id: conv._id.toString(),
        title: conv.title,
        preview: conv.preview,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        unread: false, // TODO: Implement unread logic
      }))

      res.json({
        success: true,
        data: { conversations: list },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('List conversations error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to list conversations',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'List all conversations',
    tags: ['Conversations'],
    responseSchema: ApiResponseSchema(ConversationListSchema.array()),
  }
)

/**
 * POST /api/conversations
 * Create new conversation
 */
docRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreateConversationSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const { title, userId } = validation.data

      // @ts-expect-error - Mongoose create() type inference issue
      const conversation = await Conversation.create({
        title: title || 'New Chat',
        userId,
        messages: [],
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

/**
 * GET /api/conversations/:id
 * Get conversation with messages
 */
docRouter.get(
  '/:id',
  async (req, res) => {
    try {
      const { id } = req.params

      // @ts-expect-error - Mongoose findById type inference issue
      const conversation = await Conversation.findById(id).lean().exec()

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          timestamp: new Date().toISOString(),
        })
      }

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

/**
 * PATCH /api/conversations/:id
 * Update conversation (rename)
 */
docRouter.patch(
  '/:id',
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

/**
 * DELETE /api/conversations/:id
 * Soft delete conversation
 */
docRouter.delete(
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

/**
 * DELETE /api/conversations/:id/hard
 * Hard delete conversation (permanent)
 */
docRouter.delete(
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

/**
 * POST /api/conversations/:id/restore
 * Restore soft deleted conversation
 */
docRouter.post(
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
