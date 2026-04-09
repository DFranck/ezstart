/**
 * GET /api/ai/prompts
 * List system prompts scoped by appName
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

const listPromptsQuerySchema = z.object({
  appName: z.string().min(1).optional().describe('Application name (optional — omit for all apps)'),
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .optional()
    .describe('Filter by prompt type'),
  provider: z
    .enum(['all', 'gemini', 'openai', 'anthropic'])
    .optional()
    .describe('Filter by AI provider'),
  active: z.enum(['true', 'false']).optional().describe('Filter by active status'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Maximum items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const listPromptsRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(listPromptsRegistry, router, '/prompts')

docRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listPromptsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { appName, type, provider, active, limit, offset } = validation.data

      const filter: Record<string, unknown> = {}
      if (appName) filter.appName = appName
      if (type) filter.type = type
      if (provider) filter.provider = provider
      if (active !== undefined) filter.isActive = active === 'true'

      const [prompts, total] = await Promise.all([
        AISystemPrompt.find(filter)
          .sort({ type: 1, key: 1 })
          .skip(offset)
          .limit(limit)
          .lean()
          .exec(),
        AISystemPrompt.countDocuments(filter),
      ])

      sendSuccess(
        res,
        {
          prompts: prompts.map(p => {
            const doc = p as Record<string, unknown>
            return {
              ...p,
              _id: String(doc._id),
              createdAt:
                doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
              updatedAt:
                doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
            }
          }),
        },
        { total, limit, offset }
      )
    } catch (error) {
      logger.error('[AI Prompts] List error:', error)
      sendError(res, 'Failed to list prompts')
    }
  },
  {
    summary: 'List system prompts (scoped by appName)',
    tags: ['AI Prompts'],
  }
)

export default router
