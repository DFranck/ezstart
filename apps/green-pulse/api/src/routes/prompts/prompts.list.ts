import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { z } from 'zod'
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const listPromptsRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(listPromptsRegistry, router, '/prompts')

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

const ListPromptsResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  data: z.array(PromptSchema).describe('List of prompt objects'),
  timestamp: z.string().describe('Response ISO timestamp'),
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
      type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).optional().describe('Filter by prompt type'),
      provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).optional().describe('Filter by AI provider'),
      active: z.string().optional().describe('Filter by active status'),
      limit: z.coerce.number().default(20).optional().describe('Number of prompts to return'),
      offset: z.coerce.number().default(0).optional().describe('Number of prompts to skip'),
    }),
    responseSchema: ListPromptsResponseSchema,
  }
)

export default router
