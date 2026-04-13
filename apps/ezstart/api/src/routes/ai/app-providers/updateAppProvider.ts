/**
 * PATCH /api/ai/app-providers/:id
 * Update an existing app provider configuration
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

const updateBodySchema = z.object({
  apps: z
    .array(z.string().min(1).max(50))
    .min(1)
    .optional()
    .describe('Apps this provider is scoped to — use ["*"] for all apps'),
  enabled: z.boolean().optional().describe('Toggle provider on/off'),
  priority: z.number().int().min(1).max(99).optional().describe('Fallback order'),
  config: z
    .object({
      model: z.string().max(100).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).optional(),
    })
    .optional()
    .describe('Provider config overrides'),
})

const paramsSchema = z.object({
  id: z.string().min(1).describe('App provider document ID'),
})

export const updateAppProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(updateAppProviderRegistry, router, '/app-providers')

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

      // If apps[] is being updated, also clear the legacy appName field so
      // the doc is fully migrated to the new shape.
      const update: Record<string, unknown> = { ...body }
      const unset: Record<string, ''> = {}
      if (body.apps) {
        unset.appName = ''
      }

      const provider = await AppProvider.findByIdAndUpdate(
        id,
        {
          $set: update,
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
        { new: true }
      )
        .lean()
        .exec()

      if (!provider) {
        return sendError(res, 'App provider not found', 404)
      }

      const doc = provider as Record<string, unknown>
      sendSuccess(res, {
        ...provider,
        _id: String(doc._id),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      })
    } catch (error: unknown) {
      logger.error('[AI AppProviders] Update error:', error)
      sendError(res, 'Failed to update app provider')
    }
  },
  {
    summary: 'Update an app provider configuration',
    tags: ['AI App Providers'],
    bodySchema: updateBodySchema,
  }
)

export default router
