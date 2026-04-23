/**
 * PATCH /api/ai/prompts/:key
 * Update a system prompt. Optional `?app=<appName>` query scopes the lookup
 * for per-app callers. Admin/global callers omit it and lookup is by key only.
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { z } from 'zod'
import { AISystemPrompt, APPS_WILDCARD } from '../../../models/AISystemPrompt.js'
import { clearPromptCache } from '../../../services/ai-prompt.service.js'

const updatePromptQuerySchema = z.object({
  app: z
    .string()
    .min(1)
    .optional()
    .describe('Optional app scope used to locate the prompt (matches apps[] or legacy appName).'),
})

const UpdatePromptBodySchema = z.object({
  apps: z.array(z.string().min(1).max(50)).min(1).optional().describe('New apps targeting list'),
  providers: z
    .array(z.string().min(1).max(50))
    .min(1)
    .optional()
    .describe('New providers targeting list'),
  name: z.string().min(1).max(100).optional().describe('Prompt display name'),
  description: z.string().max(500).optional().describe('Prompt description'),
  content: z.string().min(1).max(50000).optional().describe('Prompt content template'),
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .optional()
    .describe('Prompt category type'),
  isActive: z.boolean().optional().describe('Whether prompt is active'),
  isDefault: z.boolean().optional().describe('Whether this is the default prompt'),
  priority: z.number().int().min(0).max(999).optional().describe('Composition priority'),
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
      const { app } = queryValidation.data

      const validation = UpdatePromptBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      const filter: Record<string, unknown> = { key }
      if (app) {
        filter.$or = [{ apps: app }, { apps: APPS_WILDCARD }, { appName: app }]
      }

      const prompt = await AISystemPrompt.findOne(filter).exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
      }

      // Demote conflicting defaults if this one becomes default.
      if (body.isDefault) {
        const type = body.type || prompt.type
        const fallbackApps = app ? [app] : []
        const targetApps =
          body.apps || prompt.apps || (prompt.appName ? [prompt.appName] : fallbackApps)
        if (targetApps.length > 0) {
          await AISystemPrompt.updateMany(
            {
              type,
              isDefault: true,
              key: { $ne: key },
              $or: [{ apps: { $in: targetApps } }, { appName: { $in: targetApps } }],
            },
            { $set: { isDefault: false } }
          )
        }
      }

      Object.assign(prompt, body, {
        updatedBy: (req as unknown as { user?: { email?: string } }).user?.email || 'system',
      })

      await prompt.save()

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
    summary: 'Update a system prompt (multi-app + multi-provider)',
    tags: ['AI Prompts'],
    bodySchema: UpdatePromptBodySchema,
  }
)

export default router
