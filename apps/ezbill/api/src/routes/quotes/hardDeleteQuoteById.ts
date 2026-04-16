/**
 * DELETE /api/quotes/:id/hard-delete
 * Hard delete Quote
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const hardDeleteQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const hardDeleteQuoteByIdRouter = createRouterWithDoc(
  hardDeleteQuoteByIdRegistry,
  router,
  '/quotes'
)

hardDeleteQuoteByIdRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureQuoteController,
  {
    summary: 'Hard delete Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
