import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess, sendError } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'
import { clearPromptCache } from '../../services/prompt.service.js'

export const deletePromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(deletePromptRegistry, router, '/prompts')

const DeletePromptResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  message: z.string().optional().describe('Success message'),
  timestamp: z.string().describe('Response ISO timestamp'),
})

// DELETE /api/prompts/:key - Delete a prompt
docRouter.delete(
  '/:key',
  async (req, res) => {
    try {
      const { key } = req.params

      const prompt = await SystemPrompt.findOne({ key }).exec()

      if (!prompt) {
        return sendError(res, 'Prompt not found', 404)
      }

      // Prevent deletion of default prompts
      if (prompt.isDefault) {
        return sendError(res, 'Cannot delete a default prompt. Set another prompt as default first.', 400)
      }

      await SystemPrompt.deleteOne({ key })

      // Clear cache
      clearPromptCache()

      sendSuccess(res, { message: `Prompt "${key}" deleted successfully` })
    } catch (error) {
      logger.error('Error deleting prompt:', error)
      sendError(res, 'Failed to delete prompt')
    }
  },
  {
    summary: 'Delete a system prompt',
    tags: ['Prompts'],
    paramsSchema: z.object({
      key: z.string().describe('Prompt key identifier'),
    }),
    responseSchema: DeletePromptResponseSchema,
  }
)

export default router
