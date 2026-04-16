/**
 * DELETE /api/ai/app-providers/:id
 * Delete an app provider configuration
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
import { AppProvider } from '../../../models/AppProvider.js'

const paramsSchema = z.object({
  id: z.string().min(1).describe('App provider document ID'),
})

export const deleteAppProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(deleteAppProviderRegistry, router, '/app-providers')

docRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const paramsValidation = paramsSchema.safeParse(req.params)
      if (!paramsValidation.success) {
        return sendValidationError(res, 'Invalid parameters', paramsValidation.error.errors)
      }

      const { id } = paramsValidation.data

      const provider = await AppProvider.findByIdAndDelete(id).lean().exec()

      if (!provider) {
        return sendError(res, 'App provider not found', 404)
      }

      sendSuccess(res, { deleted: true, id })
    } catch (error: unknown) {
      logger.error('[AI AppProviders] Delete error:', error)
      sendError(res, 'Failed to delete app provider')
    }
  },
  {
    summary: 'Delete an app provider configuration',
    tags: ['AI App Providers'],
  }
)

export default router
