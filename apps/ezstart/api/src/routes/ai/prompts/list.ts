/**
 * GET /api/ai/prompts
 * List system prompts. Optional `?app=` filters to prompts that target that
 * app (either explicitly via `apps[]`, the legacy `appName` field, or via the
 * god-level `'*'` wildcard).
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { z } from 'zod'
import {
  AISystemPrompt,
  APPS_WILDCARD,
  PROVIDERS_WILDCARD,
  normalizeLegacyPrompt,
  type IAISystemPrompt,
} from '../../../models/AISystemPrompt.js'

const listPromptsQuerySchema = z.object({
  app: z
    .string()
    .min(1)
    .optional()
    .describe('Filter to prompts targeting this app (or god-level "*").'),
  type: z
    .enum(['general', 'extraction', 'validation', 'vision', 'custom'])
    .optional()
    .describe('Filter by prompt type'),
  provider: z
    .string()
    .min(1)
    .optional()
    .describe('Filter by provider (matches providers[] or "all").'),
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

      const { app, type, provider, active, limit, offset } = validation.data

      const conditions: Record<string, unknown>[] = []
      if (app) {
        conditions.push({
          $or: [{ apps: app }, { apps: APPS_WILDCARD }, { appName: app }],
        })
      }
      if (provider) {
        conditions.push({
          $or: [
            { providers: provider },
            { providers: PROVIDERS_WILDCARD },
            { provider },
            { provider: PROVIDERS_WILDCARD },
          ],
        })
      }
      if (type) conditions.push({ type })
      if (active !== undefined) conditions.push({ isActive: active === 'true' })

      const filter = conditions.length > 0 ? { $and: conditions } : {}

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
            const normalized = normalizeLegacyPrompt(p as Partial<IAISystemPrompt>)
            const doc = p as Record<string, unknown>
            return {
              ...normalized,
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
    summary: 'List system prompts (multi-app aware)',
    tags: ['AI Prompts'],
  }
)

export default router
