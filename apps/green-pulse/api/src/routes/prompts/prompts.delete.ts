import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const deletePromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(deletePromptRegistry, router, '/prompts')

const DeletePromptResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string(),
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

      res.json({
        success: true,
        message: `Prompt "${key}" deleted successfully`,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error deleting prompt:', error)
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
      key: z.string(),
    }),
    responseSchema: DeletePromptResponseSchema,
  }
)

export default router
