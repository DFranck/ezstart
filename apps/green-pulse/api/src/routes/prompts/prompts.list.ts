import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const listPromptsRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(listPromptsRegistry, router, '/prompts')

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

const ListPromptsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PromptSchema),
  timestamp: z.string(),
})

// GET /api/prompts - List all system prompts
docRouter.get(
  '/',
  async (req, res) => {
    try {
      const { type, provider, active, limit = 20, offset = 0 } = req.query

      const filter: any = {}
      if (type) filter.type = type
      if (provider) filter.provider = provider
      if (active !== undefined) filter.isActive = active === 'true'

      const [prompts, total] = await Promise.all([
        SystemPrompt.find(filter).sort({ type: 1, key: 1 }).skip(Number(offset)).limit(Number(limit)).lean().exec(),
        SystemPrompt.countDocuments(filter),
      ])

      res.json({
        success: true,
        data: prompts.map((p: any) => ({
          ...p,
          _id: p._id.toString(),
          createdAt: p.createdAt?.toISOString(),
          updatedAt: p.updatedAt?.toISOString(),
        })),
        meta: { total, limit: Number(limit), offset: Number(offset) },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error listing prompts:', error)
      res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to list prompts',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'List all system prompts',
    tags: ['Prompts'],
    querySchema: z.object({
      type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).optional(),
      provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).optional(),
      active: z.string().optional(),
      limit: z.coerce.number().default(20).optional().describe('Number of prompts to return'),
      offset: z.coerce.number().default(0).optional().describe('Number of prompts to skip'),
    }),
    responseSchema: ListPromptsResponseSchema,
  }
)

export default router
