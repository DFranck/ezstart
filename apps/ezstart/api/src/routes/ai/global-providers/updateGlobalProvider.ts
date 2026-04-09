/**
 * PATCH /api/ai/global-providers/:id
 * Update an existing global provider access configuration
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
import { GlobalProviderAccess } from '../../../models/GlobalProviderAccess.js'

const updateBodySchema = z.object({
  displayName: z.string().min(1).max(100).optional().describe('Human-readable display name'),
  allowedApps: z
    .array(z.string().min(1).max(50))
    .min(1)
    .optional()
    .describe('List of app names allowed, or ["*"] for all'),
  defaultModel: z.string().max(100).optional().describe('Default model identifier'),
  maxTokensPerDay: z.number().int().min(0).optional().describe('Max tokens per day per app'),
  maxCostPerMonth: z.number().min(0).optional().describe('Max cost per month per app (USD cents)'),
  isGloballyEnabled: z.boolean().optional().describe('Master switch'),
})

const paramsSchema = z.object({
  id: z.string().min(1).describe('Global provider document ID'),
})

export const updateGlobalProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(updateGlobalProviderRegistry, router, '/global-providers')

docRouter.patch(
  '/:id',
  async (req, res) => {
    try {
      const paramsValidation = paramsSchema.safeParse(req.params)
      if (!paramsValidation.success) {
        return sendValidationError(res, 'Invalid parameters', paramsValidation.error.errors)
      }

      const bodyValidation = updateBodySchema.safeParse(req.body)
      if (!bodyValidation.success) {
        return sendValidationError(res, 'Validation error', bodyValidation.error.errors)
      }

      const { id } = paramsValidation.data
      const body = bodyValidation.data

      const provider = await GlobalProviderAccess.findByIdAndUpdate(
        id,
        { $set: body },
        { new: true }
      )
        .lean()
        .exec()

      if (!provider) {
        return sendError(res, 'Global provider not found', 404)
      }

      const doc = provider as Record<string, unknown>
      sendSuccess(res, {
        ...provider,
        _id: String(doc._id),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      })
    } catch (error: unknown) {
      logger.error('[AI GlobalProviders] Update error:', error)
      sendError(res, 'Failed to update global provider')
    }
  },
  {
    summary: 'Update a global provider access configuration',
    tags: ['AI Global Providers'],
    bodySchema: updateBodySchema,
  }
)

export default router
