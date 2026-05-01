/**
 * POST /api/ai/prompts
 * Create a new system prompt with multi-app + multi-provider assignment.
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

const CreatePromptBodySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-_]+$/, 'Key must be lowercase alphanumeric with dashes/underscores')
    .describe('Unique prompt key identifier'),
  apps: z
    .array(z.string().min(1).max(50))
    .min(1)
    .describe('List of target apps. Use ["*"] for god-level (all apps).'),
  providers: z
    .array(z.string().min(1).max(50))
    .min(1)
    .describe('List of target providers. Use ["all"] to apply to every provider.'),
  name: z.string().min(1).max(100).describe('Prompt display name'),
  description: z.string().max(500).optional().describe('Prompt description'),
  content: z.string().min(1).max(50000).describe('Prompt content template'),
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .default('general')
    .describe('Prompt category type'),
  isActive: z.boolean().default(true).describe('Whether prompt is active'),
  isDefault: z.boolean().default(false).describe('Whether this is the default prompt'),
  priority: z
    .number()
    .int()
    .min(0)
    .max(999)
    .optional()
    .describe('Composition priority (higher first within group)'),
  variables: z.array(z.string()).optional().describe('Template variable names'),
  providerAssignments: z
    .array(
      z.object({
        providerId: z.string().min(1),
        priority: z.number().min(1).max(99),
      })
    )
    .optional()
    .describe('Detailed provider assignments with per-provider priority'),
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

      // Uniqueness: a key collides with any existing doc that targets one of
      // the same apps. Use $in so any overlap is rejected.
      const existing = await AISystemPrompt.findOne({
        key: body.key,
        $or: [{ apps: { $in: body.apps } }, { appName: { $in: body.apps } }],
      })
        .lean()
        .exec()
      if (existing) {
        return sendError(
          res,
          'A prompt with this key already exists for one of the target apps',
          409
        )
      }

      // If marked default, demote previous defaults of the same type that
      // share at least one of the target apps.
      if (body.isDefault) {
        await AISystemPrompt.updateMany(
          {
            type: body.type,
            isDefault: true,
            $or: [{ apps: { $in: body.apps } }, { appName: { $in: body.apps } }],
          },
          { $set: { isDefault: false } }
        )
      }

      const prompt = new AISystemPrompt({
        ...body,
        updatedBy: (req as unknown as { user?: { email?: string } }).user?.email || 'system',
      })

      await prompt.save()
      clearPromptCache()

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
    summary: 'Create a system prompt (multi-app + multi-provider)',
    tags: ['AI Prompts'],
    bodySchema: CreatePromptBodySchema,
  }
)

export default router
