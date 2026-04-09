/**
 * PATCH /api/ai/app-providers/:id/toggle
 * Quick toggle enabled/disabled for an app provider
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

const paramsSchema = z.object({
  id: z.string().min(1).describe('App provider document ID'),
})

export const toggleAppProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(toggleAppProviderRegistry, router, '/app-providers')

docRouter.patch(
  '/:id/toggle',
  async (req, res) => {
    try {
      const paramsValidation = paramsSchema.safeParse(req.params)
      if (!paramsValidation.success) {
        return sendValidationError(res, 'Invalid parameters', paramsValidation.error.errors)
      }

      const { id } = paramsValidation.data

      // Find current state
      const current = await AppProvider.findById(id).lean().exec()
      if (!current) {
        return sendError(res, 'App provider not found', 404)
      }

      // Toggle
      const provider = await AppProvider.findByIdAndUpdate(
        id,
        { $set: { enabled: !current.enabled } },
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
      logger.error('[AI AppProviders] Toggle error:', error)
      sendError(res, 'Failed to toggle app provider')
    }
  },
  {
    summary: 'Toggle an app provider enabled/disabled',
    tags: ['AI App Providers'],
  }
)

export default router
