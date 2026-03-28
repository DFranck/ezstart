import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'
import { clearPromptCache } from '../../services/prompt.service.js'

export const updatePromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updatePromptRegistry, router, '/prompts')

const UpdatePromptBodySchema = z.object({
  name: z.string().min(1).max(100).optional().describe('Prompt display name'),
  description: z.string().max(500).optional().describe('Prompt description'),
  content: z.string().min(1).max(10000).optional().describe('Prompt content template'),
  type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).optional().describe('Prompt category type'),
  provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).optional().describe('Target AI provider'),
  isActive: z.boolean().optional().describe('Whether prompt is active'),
  isDefault: z.boolean().optional().describe('Whether this is the default prompt'),
  variables: z.array(z.string()).optional().describe('Template variable names'),
})

const UpdatePromptResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: z.any().describe('Updated prompt object'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// PATCH /api/prompts/:key - Update a prompt
docRouter.patch(
  '/:key',
  async (req, res) => {
    try {
      const { key } = req.params
      const validation = UpdatePromptBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      const prompt = await SystemPrompt.findOne({ key }).exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
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

      sendSuccess(res, {
        ...prompt.toObject(),
        _id: prompt._id.toString(),
        createdAt: prompt.createdAt?.toISOString(),
        updatedAt: prompt.updatedAt?.toISOString(),
      })
    } catch (error: any) {
      logger.error('Error updating prompt:', error)
      sendError(res, 'Failed to update prompt')
    }
  },
  {
    summary: 'Update a system prompt',
    tags: ['Prompts'],
    paramsSchema: z.object({
      key: z.string().describe('Prompt key identifier'),
    }),
    bodySchema: UpdatePromptBodySchema,
    responseSchema: UpdatePromptResponseSchema,
  }
)

export default router
