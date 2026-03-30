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
import { SystemPrompt } from '../../models/SystemPrompt.js'

export const listPromptsRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(listPromptsRegistry, router, '/prompts')

const PromptSchema = z.object({
  _id: z.string().describe('Prompt unique identifier'),
  key: z.string().describe('Prompt key identifier'),
  name: z.string().describe('Prompt display name'),
  description: z.string().optional().describe('Prompt description'),
  content: z.string().describe('Prompt content template'),
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .describe('Prompt category type'),
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
      const listPromptsQuerySchema = z.object({
        type: z.enum(['general', 'extraction', 'validation', 'vision', 'custom']).optional(),
        provider: z.enum(['all', 'gemini', 'openai', 'anthropic']).optional(),
        active: z.enum(['true', 'false']).optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0),
      })

      const validation = listPromptsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { type, provider, active, limit, offset } = validation.data

      const filter: Record<string, unknown> = {}
      if (type) filter.type = type
      if (provider) filter.provider = provider
      if (active !== undefined) filter.isActive = active === 'true'

      const [prompts, total] = await Promise.all([
        SystemPrompt.find(filter).sort({ type: 1, key: 1 }).skip(offset).limit(limit).lean().exec(),
        SystemPrompt.countDocuments(filter),
      ])

      sendSuccess(
        res,
        prompts.map(p => {
          const doc = p as Record<string, unknown>
          return {
            ...p,
            _id: String(doc._id),
            createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
            updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
          }
        }),
        { total, limit, offset }
      )
    } catch (error) {
      logger.error('Error listing prompts:', error)
      sendError(res, 'Failed to list prompts')
    }
  },
  {
    summary: 'List all system prompts',
    tags: ['Prompts'],
    querySchema: z.object({
      type: z
        .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
        .optional()
        .describe('Filter by prompt type'),
      provider: z
        .enum(['all', 'gemini', 'openai', 'anthropic'])
        .optional()
        .describe('Filter by AI provider'),
      active: z.string().optional().describe('Filter by active status'),
      limit: z.coerce.number().default(20).optional().describe('Number of prompts to return'),
      offset: z.coerce.number().default(0).optional().describe('Number of prompts to skip'),
    }),
    responseSchema: ListPromptsResponseSchema,
  }
)

export default router
