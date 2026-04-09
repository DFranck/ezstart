/**
 * DELETE /api/ai/global-providers/:id
 * Delete a global provider access configuration
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

const paramsSchema = z.object({
  id: z.string().min(1).describe('Global provider document ID'),
})

export const deleteGlobalProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(deleteGlobalProviderRegistry, router, '/global-providers')

docRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const paramsValidation = paramsSchema.safeParse(req.params)
      if (!paramsValidation.success) {
        return sendValidationError(res, 'Invalid parameters', paramsValidation.error.errors)
      }

      const { id } = paramsValidation.data

      const provider = await GlobalProviderAccess.findByIdAndDelete(id).lean().exec()

      if (!provider) {
        return sendError(res, 'Global provider not found', 404)
      }

      sendSuccess(res, { deleted: true, id })
    } catch (error: unknown) {
      logger.error('[AI GlobalProviders] Delete error:', error)
      sendError(res, 'Failed to delete global provider')
    }
  },
  {
    summary: 'Delete a global provider access configuration',
    tags: ['AI Global Providers'],
  }
)

export default router
