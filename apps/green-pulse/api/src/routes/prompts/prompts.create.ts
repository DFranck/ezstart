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
    .regex(/^[a-z0-9-_]+$/, 'Key must be lowercase alphanumeric with dashes/underscores'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(10000),
  type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).default('general'),
  provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).default('all'),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  variables: z.array(z.string()).optional(),
})

const CreatePromptResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  timestamp: z.string(),
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
      console.error('Error creating prompt:', error)

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
