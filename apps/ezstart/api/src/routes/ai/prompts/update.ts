/**
 * PATCH /api/ai/prompts/:key
 * Update a system prompt (scoped by appName query param)
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
import { clearPromptCache } from '../../../services/ai-prompt.service.js'

const updatePromptQuerySchema = z.object({
  appName: z.string().min(1).describe('Application name (required)'),
})

const UpdatePromptBodySchema = z.object({
  name: z.string().min(1).max(100).optional().describe('Prompt display name'),
  description: z.string().max(500).optional().describe('Prompt description'),
  content: z.string().min(1).max(10000).optional().describe('Prompt content template'),
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .optional()
    .describe('Prompt category type'),
  provider: z
    .enum(['all', 'gemini', 'openai', 'anthropic'])
    .optional()
    .describe('Target AI provider'),
  isActive: z.boolean().optional().describe('Whether prompt is active'),
  isDefault: z.boolean().optional().describe('Whether this is the default prompt'),
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

export const updatePromptRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(updatePromptRegistry, router, '/prompts')

docRouter.patch(
  '/:key',
  async (req, res) => {
    try {
      const { key } = req.params

      const queryValidation = updatePromptQuerySchema.safeParse(req.query)
      if (!queryValidation.success) {
        return sendValidationError(res, 'Invalid query parameters', queryValidation.error.errors)
      }
      const { appName } = queryValidation.data

      const validation = UpdatePromptBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      const prompt = await AISystemPrompt.findOne({ key, appName }).exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
      }

      // If setting as default, unset other defaults of same type + appName
      if (body.isDefault) {
        const type = body.type || prompt.type
        await AISystemPrompt.updateMany(
          { type, appName, isDefault: true, key: { $ne: key } },
          { $set: { isDefault: false } }
        )
      }

      Object.assign(prompt, body, {
        updatedBy: req.user?.email || 'system',
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
    } catch (error: unknown) {
      logger.error('[AI Prompts] Update error:', error)
      sendError(res, 'Failed to update prompt')
    }
  },
  {
    summary: 'Update a system prompt (scoped by appName)',
    tags: ['AI Prompts'],
    bodySchema: UpdatePromptBodySchema,
  }
)

export default router
