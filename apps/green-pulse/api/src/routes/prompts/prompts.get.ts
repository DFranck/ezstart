import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const getPromptRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getPromptRegistry, router, '/prompts')

const PromptSchema = z.object({
  _id: z.string().describe('Prompt unique identifier'),
  key: z.string().describe('Prompt key identifier'),
  name: z.string().describe('Prompt display name'),
  description: z.string().optional().describe('Prompt description'),
  content: z.string().describe('Prompt content template'),
  type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).describe('Prompt category type'),
  provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).describe('Target AI provider'),
  isActive: z.boolean().describe('Whether prompt is active'),
  isDefault: z.boolean().describe('Whether this is the default prompt'),
  variables: z.array(z.string()).optional().describe('Template variable names'),
  updatedBy: z.string().optional().describe('User who last updated'),
  createdAt: z.string().describe('Creation date ISO string'),
  updatedAt: z.string().describe('Last update date ISO string'),
})

const GetPromptResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: PromptSchema.nullable().describe('Prompt object or null'),
  timestamp: z.string().describe('Response ISO timestamp'),
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
      logger.error('Error getting prompt:', error)
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
      key: z.string().describe('Prompt key identifier'),
    }),
    responseSchema: GetPromptResponseSchema,
  }
)

export default router
