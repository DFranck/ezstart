import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const createPromptRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
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
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .default('general')
    .describe('Prompt category type'),
  provider: z
    .enum(['all', 'gemini', 'openai', 'anthropic'])
    .default('all')
    .describe('Target AI provider'),
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
      const validation = CreatePromptBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      // Check if key already exists
      const existing = await SystemPrompt.findOne({ key: body.key }).lean().exec()
      if (existing) {
        return sendError(res, 'A prompt with this key already exists', 409)
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
        updatedBy:
          (req as unknown as Record<string, unknown> & { user?: { email?: string } }).user?.email ||
          'system',
      })

      await prompt.save()

      sendSuccess(res.status(201), {
        ...prompt.toObject(),
        _id: prompt._id.toString(),
        createdAt: prompt.createdAt?.toISOString(),
        updatedAt: prompt.updatedAt?.toISOString(),
      })
    } catch (error: unknown) {
      logger.error('Error creating prompt:', error)
      sendError(res, 'Failed to create prompt')
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
