/**
 * POST /api/ai/prompts
 * Create a new system prompt scoped by appName
 */

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
import { AISystemPrompt } from '../../../models/AISystemPrompt.js'

const CreatePromptBodySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-_]+$/, 'Key must be lowercase alphanumeric with dashes/underscores')
    .describe('Unique prompt key identifier'),
  appName: z.string().min(1).max(50).describe('Application name (required)'),
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
  providers: z
    .array(
      z.object({
        providerId: z.string().min(1),
        priority: z.number().min(1).max(99),
      })
    )
    .optional()
    .describe('Provider assignments with priority'),
})

export const createPromptRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(createPromptRegistry, router, '/prompts')

docRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreatePromptBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      // Check if key already exists for this appName
      const existing = await AISystemPrompt.findOne({
        key: body.key,
        appName: body.appName,
      })
        .lean()
        .exec()
      if (existing) {
        return sendError(res, 'A prompt with this key already exists for this app', 409)
      }

      // If setting as default, unset other defaults of same type + appName
      if (body.isDefault) {
        await AISystemPrompt.updateMany(
          { type: body.type, appName: body.appName, isDefault: true },
          { $set: { isDefault: false } }
        )
      }

      const prompt = new AISystemPrompt({
        ...body,
        updatedBy: (req as unknown as { user?: { email?: string } }).user?.email || 'system',
      })

      await prompt.save()

      sendSuccess(res.status(201), {
        ...prompt.toObject(),
        _id: prompt._id.toString(),
        createdAt: prompt.createdAt?.toISOString(),
        updatedAt: prompt.updatedAt?.toISOString(),
      })
    } catch (error: unknown) {
      logger.error('[AI Prompts] Create error:', error)
      sendError(res, 'Failed to create prompt')
    }
  },
  {
    summary: 'Create a new system prompt (scoped by appName)',
    tags: ['AI Prompts'],
    bodySchema: CreatePromptBodySchema,
  }
)

export default router
