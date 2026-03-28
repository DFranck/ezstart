import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'
import { clearPromptCache } from '../../services/prompt.service.js'

export const updatePromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updatePromptRegistry, router, '/prompts')

const UpdatePromptBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).optional(),
  provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
})

const UpdatePromptResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  timestamp: z.string(),
})

// PATCH /api/prompts/:key - Update a prompt
docRouter.patch(
  '/:key',
  async (req, res) => {
    try {
      const { key } = req.params
      const body = UpdatePromptBodySchema.parse(req.body)

      const prompt = await SystemPrompt.findOne({ key }).exec()

      if (!prompt) {
        return res.status(404).json({
          success: false,
          error: 'Prompt not found',
          timestamp: new Date().toISOString(),
        })
      }

      // If setting as default, unset other defaults of same type
      if (body.isDefault) {
        const type = body.type || prompt.type
        await SystemPrompt.updateMany(
          { type, isDefault: true, key: { $ne: key } },
          { $set: { isDefault: false } }
        )
      }

      // Update fields
      Object.assign(prompt, body, {
        updatedBy: (req as any).user?.email || 'system',
      })

      await prompt.save()

      // Clear cache so next chat request gets updated prompt
      clearPromptCache()

      res.json({
        success: true,
        data: {
          ...prompt.toObject(),
          _id: prompt._id.toString(),
          createdAt: prompt.createdAt?.toISOString(),
          updatedAt: prompt.updatedAt?.toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      logger.error('Error updating prompt:', error)

      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update prompt',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Update a system prompt',
    tags: ['Prompts'],
    paramsSchema: z.object({
      key: z.string(),
    }),
    bodySchema: UpdatePromptBodySchema,
    responseSchema: UpdatePromptResponseSchema,
  }
)

export default router
