/**
 * POST /api/ai/global-providers
 * Create a new global provider access configuration
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

const createBodySchema = z.object({
  providerId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with dashes')
    .describe('Unique provider identifier (e.g. gemini-flash)'),
  providerType: z.enum(['gemini', 'openai', 'anthropic']).describe('Provider type'),
  displayName: z.string().min(1).max(100).describe('Human-readable display name'),
  allowedApps: z
    .array(z.string().min(1).max(50))
    .min(1)
    .describe('List of app names allowed to use this provider, or ["*"] for all'),
  defaultModel: z.string().max(100).optional().describe('Default model identifier'),
  maxTokensPerDay: z.number().int().min(0).optional().describe('Max tokens per day per app'),
  maxCostPerMonth: z.number().min(0).optional().describe('Max cost per month per app (USD cents)'),
  isGloballyEnabled: z
    .boolean()
    .default(true)
    .describe('Master switch — if false, no app can use it'),
})

export const createGlobalProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(createGlobalProviderRegistry, router, '/global-providers')

docRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = createBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      // Check for duplicate providerId
      const existing = await GlobalProviderAccess.findOne({ providerId: body.providerId })
        .lean()
        .exec()

      if (existing) {
        return sendError(res, `Global provider "${body.providerId}" already exists`, 409)
      }

      // Attach grantedBy from authenticated user
      const grantedBy = req.userId || undefined

      const provider = new GlobalProviderAccess({ ...body, grantedBy })
      await provider.save()

      sendSuccess(res.status(201), {
        ...provider.toObject(),
        _id: provider._id.toString(),
        createdAt: provider.createdAt?.toISOString(),
        updatedAt: provider.updatedAt?.toISOString(),
      })
    } catch (error: unknown) {
      logger.error('[AI GlobalProviders] Create error:', error)
      sendError(res, 'Failed to create global provider')
    }
  },
  {
    summary: 'Create a new global provider access configuration',
    tags: ['AI Global Providers'],
    bodySchema: createBodySchema,
  }
)

export default router
