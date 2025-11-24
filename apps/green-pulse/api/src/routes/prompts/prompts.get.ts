import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const getPromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getPromptRegistry, router, '/prompts')

const PromptSchema = z.object({
  _id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  content: z.string(),
  type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']),
  provider: z.enum(['all', 'gemini', 'openai', 'anthropic']),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  variables: z.array(z.string()).optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const GetPromptResponseSchema = z.object({
  success: z.boolean(),
  data: PromptSchema.nullable(),
  timestamp: z.string(),
})

// GET /api/prompts/:key - Get a prompt by key
docRouter.get(
  '/:key',
  async (req, res) => {
    try {
      const { key } = req.params

      const prompt = await SystemPrompt.findOne({ key }).lean().exec()

      if (!prompt) {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Prompt not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: {
          ...prompt,
          _id: (prompt as any)._id.toString(),
          createdAt: (prompt as any).createdAt?.toISOString(),
          updatedAt: (prompt as any).updatedAt?.toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error getting prompt:', error)
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to get prompt',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get a system prompt by key',
    tags: ['Prompts'],
    paramsSchema: z.object({
      key: z.string(),
    }),
    responseSchema: GetPromptResponseSchema,
  }
)

export default router
