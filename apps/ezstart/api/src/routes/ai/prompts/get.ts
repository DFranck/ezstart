/**
 * GET /api/ai/prompts/:key
 * Get a prompt by key and appName
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

const getPromptQuerySchema = z.object({
  appName: z.string().min(1).optional().describe('Application name (optional)'),
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

      const { appName } = validation.data

      const filter: Record<string, string> = { key }
      if (appName) filter.appName = appName

      const prompt = await AISystemPrompt.findOne(filter).lean().exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
      }

      const doc = prompt as Record<string, unknown>
      sendSuccess(res, {
        ...prompt,
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
    summary: 'Get a system prompt by key (scoped by appName)',
    tags: ['AI Prompts'],
  }
)

export default router
