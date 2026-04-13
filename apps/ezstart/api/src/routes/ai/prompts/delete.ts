/**
 * DELETE /api/ai/prompts/:key
 * Delete a system prompt. App scope provided via `?app=<appName>` query.
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
import { AISystemPrompt, APPS_WILDCARD } from '../../../models/AISystemPrompt.js'
import { clearPromptCache } from '../../../services/ai-prompt.service.js'

const deletePromptQuerySchema = z.object({
  app: z.string().min(1).describe('App scope used to locate the prompt to delete'),
})

export const deletePromptRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(deletePromptRegistry, router, '/prompts')

docRouter.delete(
  '/:key',
  async (req, res) => {
    try {
      const { key } = req.params

      const validation = deletePromptQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }
      const { app } = validation.data

      const prompt = await AISystemPrompt.findOne({
        key,
        $or: [{ apps: app }, { apps: APPS_WILDCARD }, { appName: app }],
      }).exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
      }

      if (prompt.isDefault) {
        return sendError(
          res,
          'Cannot delete a default prompt. Set another prompt as default first.',
          400
        )
      }

      await AISystemPrompt.deleteOne({ _id: prompt._id })

      clearPromptCache()

      sendSuccess(res, { message: `Prompt "${key}" deleted successfully` })
    } catch (error) {
      logger.error('[AI Prompts] Delete error:', error)
      sendError(res, 'Failed to delete prompt')
    }
  },
  {
    summary: 'Delete a system prompt',
    tags: ['AI Prompts'],
  }
)

export default router
