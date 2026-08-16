/**
 * GET /api/ai/prompts/:key
 * Get a prompt by key. Optional `?app=` constrains lookup to a given scope.
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
import {
  AISystemPrompt,
  APPS_WILDCARD,
  normalizeLegacyPrompt,
  type IAISystemPrompt,
} from '../../../models/AISystemPrompt.js'

const getPromptQuerySchema = z.object({
  app: z.string().min(1).optional().describe('Optional app scope used to locate the prompt'),
})

export const getPromptRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(getPromptRegistry, router, '/prompts')

docRouter.get(
  '/:key',
  async (req, res) => {
    try {
      const key = req.params.key as string

      const validation = getPromptQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { app } = validation.data

      const filter: Record<string, unknown> = { key }
      if (app) {
        filter.$or = [{ apps: app }, { apps: APPS_WILDCARD }, { appName: app }]
      }

      const prompt = await AISystemPrompt.findOne(filter).lean().exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
      }

      const normalized = normalizeLegacyPrompt(prompt as Partial<IAISystemPrompt>)
      const doc = prompt as Record<string, unknown>
      sendSuccess(res, {
        ...normalized,
        _id: String(doc._id),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      })
    } catch (error) {
      logger.error('[AI Prompts] Get error:', error)
      sendError(res, 'Failed to get prompt')
    }
  },
  {
    summary: 'Get a system prompt by key',
    tags: ['AI Prompts'],
  }
)

export default router
