/**
 * GET /api/ai/app-providers
 * List app providers with optional filters (paginated)
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
import { AppProvider } from '../../../models/AppProvider.js'

const listQuerySchema = z.object({
  appName: z.string().min(1).optional().describe('Filter by app name (omit for all apps)'),
  enabled: z.enum(['true', 'false']).optional().describe('Filter by enabled status'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Maximum items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const listAppProvidersRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(listAppProvidersRegistry, router, '/app-providers')

docRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { appName, enabled, limit, offset } = validation.data

      const filter: Record<string, unknown> = {}
      if (appName) filter.appName = appName
      if (enabled !== undefined) filter.enabled = enabled === 'true'

      const [providers, total] = await Promise.all([
        AppProvider.find(filter)
          .sort({ appName: 1, priority: 1 })
          .skip(offset)
          .limit(limit)
          .lean()
          .exec(),
        AppProvider.countDocuments(filter),
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
      logger.error('[AI AppProviders] List error:', error)
      sendError(res, 'Failed to list app providers')
    }
  },
  {
    summary: 'List app providers (paginated, optional filters)',
    tags: ['AI App Providers'],
  }
)

export default router
