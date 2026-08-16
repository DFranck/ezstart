/**
 * DELETE /api/quotes/:id
 * Soft delete Quote
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const deleteQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const deleteQuoteByIdRouter = createRouterWithDoc(deleteQuoteByIdRegistry, router, '/quotes')

deleteQuoteByIdRouter.delete(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.softDeleteSecureQuoteController,
  {
    summary: 'Soft delete Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
