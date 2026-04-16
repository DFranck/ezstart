/**
 * GET /api/ai/global-providers
 * List global provider access configurations (paginated)
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
import { GlobalProviderAccess } from '../../../models/GlobalProviderAccess.js'

const listQuerySchema = z.object({
  isGloballyEnabled: z
    .enum(['true', 'false'])
    .optional()
    .describe('Filter by globally enabled status'),
  providerType: z
    .enum(['gemini', 'openai', 'anthropic'])
    .optional()
    .describe('Filter by provider type'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Maximum items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const listGlobalProvidersRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(listGlobalProvidersRegistry, router, '/global-providers')

docRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { isGloballyEnabled, providerType, limit, offset } = validation.data

      const filter: Record<string, unknown> = {}
      if (isGloballyEnabled !== undefined) filter.isGloballyEnabled = isGloballyEnabled === 'true'
      if (providerType) filter.providerType = providerType

      const [providers, total] = await Promise.all([
        GlobalProviderAccess.find(filter)
          .sort({ providerType: 1, providerId: 1 })
          .skip(offset)
          .limit(limit)
          .lean()
          .exec(),
        GlobalProviderAccess.countDocuments(filter),
      ])

      sendSuccess(
        res,
        {
          providers: providers.map(p => {
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
      logger.error('[AI GlobalProviders] List error:', error)
      sendError(res, 'Failed to list global providers')
    }
  },
  {
    summary: 'List global provider access configurations (paginated)',
    tags: ['AI Global Providers'],
  }
)

export default router
