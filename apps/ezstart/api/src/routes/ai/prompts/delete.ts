/**
 * DELETE /api/ai/prompts/:key
 * Delete a system prompt (scoped by appName query param)
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

const deletePromptQuerySchema = z.object({
  appName: z.string().min(1).describe('Application name (required)'),
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
      const { appName } = validation.data

      const prompt = await AISystemPrompt.findOne({ key, appName }).exec()

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

      await AISystemPrompt.deleteOne({ key, appName })

      clearPromptCache()

      sendSuccess(res, { message: `Prompt "${key}" deleted successfully` })
    } catch (error) {
      logger.error('[AI Prompts] Delete error:', error)
      sendError(res, 'Failed to delete prompt')
    }
  },
  {
    summary: 'Delete a system prompt (scoped by appName)',
    tags: ['AI Prompts'],
  }
)

export default router
