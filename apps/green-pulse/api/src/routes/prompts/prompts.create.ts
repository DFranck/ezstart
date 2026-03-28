import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const createPromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(createPromptRegistry, router, '/prompts')

const CreatePromptBodySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-_]+$/, 'Key must be lowercase alphanumeric with dashes/underscores')
    .describe('Unique prompt key identifier'),
  name: z.string().min(1).max(100).describe('Prompt display name'),
  description: z.string().max(500).optional().describe('Prompt description'),
  content: z.string().min(1).max(10000).describe('Prompt content template'),
  type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).default('general').describe('Prompt category type'),
  provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).default('all').describe('Target AI provider'),
  isActive: z.boolean().default(true).describe('Whether prompt is active'),
  isDefault: z.boolean().default(false).describe('Whether this is the default prompt'),
  variables: z.array(z.string()).optional().describe('Template variable names'),
})

const CreatePromptResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: z.any().describe('Created prompt object'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// POST /api/prompts - Create a new prompt
docRouter.post(
  '/',
  async (req, res) => {
    try {
      const body = CreatePromptBodySchema.parse(req.body)

      // Check if key already exists
      const existing = await SystemPrompt.findOne({ key: body.key }).lean().exec()
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A prompt with this key already exists',
          timestamp: new Date().toISOString(),
        })
      }

      // If setting as default, unset other defaults of same type
      if (body.isDefault) {
        await SystemPrompt.updateMany(
          { type: body.type, isDefault: true },
          { $set: { isDefault: false } }
        )
      }

      const prompt = new SystemPrompt({
        ...body,
        updatedBy: (req as any).user?.email || 'system',
      })

      await prompt.save()

      res.status(201).json({
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
      logger.error('Error creating prompt:', error)

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
        error: 'Failed to create prompt',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Create a new system prompt',
    tags: ['Prompts'],
    bodySchema: CreatePromptBodySchema,
    responseSchema: CreatePromptResponseSchema,
  }
)

export default router
