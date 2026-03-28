import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
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
        return res.status(404).json({
          success: false,
          error: 'Prompt not found',
          timestamp: new Date().toISOString(),
        })
      }

      // Prevent deletion of default prompts
      if (prompt.isDefault) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete a default prompt. Set another prompt as default first.',
          timestamp: new Date().toISOString(),
        })
      }

      await SystemPrompt.deleteOne({ key })

      // Clear cache
      clearPromptCache()

      res.json({
        success: true,
        message: `Prompt "${key}" deleted successfully`,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error deleting prompt:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete prompt',
        timestamp: new Date().toISOString(),
      })
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
