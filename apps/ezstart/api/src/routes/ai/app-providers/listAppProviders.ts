/**
 * GET /api/ai/app-providers
 * List app providers with optional filters (paginated)
 *
 * Each record is enriched with metadata from the global ProviderRegistry
 * (name, capabilities, model, registered flag) so the chat UI can render
 * provider selectors without a second round-trip to the global catalog.
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
import { providerRegistry, enrichedAppProviderSchema } from '@ezstart/ai-sdk'
import type { AIProviderInfo, ProviderCapabilities } from '@ezstart/ai-sdk'
import { z } from 'zod'
import { AppProvider } from '../../../models/AppProvider.js'

const listQuerySchema = z.object({
  appName: z.string().min(1).optional().describe('Filter by app name (omit for all apps)'),
  enabled: z.enum(['true', 'false']).optional().describe('Filter by enabled status'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Maximum items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

// Response envelope matches the monorepo-wide `{ success, data, meta }` shape.
// `data.providers` are AppProvider documents enriched with global registry
// metadata (name, capabilities, model, registered flag) so the chat UI can
// render selectors without a second round-trip.
const listAppProvidersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    providers: z.array(enrichedAppProviderSchema),
  }),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
})

const EMPTY_CAPABILITIES: ProviderCapabilities = {
  text: false,
  vision: false,
  audio: false,
  streaming: false,
  functionCalling: false,
  jsonMode: false,
}

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

      // Build lookup map from global registry for O(1) join
      const registryMap = new Map<string, AIProviderInfo>(
        providerRegistry.list().map(p => [p.id, p])
      )

      sendSuccess(
        res,
        {
          providers: providers.map(p => {
            const doc = p as Record<string, unknown>
            const registryEntry = registryMap.get(String(doc.providerId))

            return {
              ...p,
              _id: String(doc._id),
              createdAt:
                doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
              updatedAt:
                doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
              // Enrichment from global registry (fallback to empty values if provider removed)
              name: registryEntry?.name ?? String(doc.providerId),
              capabilities: registryEntry?.capabilities ?? EMPTY_CAPABILITIES,
              model: registryEntry?.model ?? '',
              registered: Boolean(registryEntry),
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
    summary: 'List app providers (paginated, optional filters, enriched with registry metadata)',
    tags: ['AI App Providers'],
    querySchema: listQuerySchema,
    responseSchema: listAppProvidersResponseSchema,
  }
)

export default router
