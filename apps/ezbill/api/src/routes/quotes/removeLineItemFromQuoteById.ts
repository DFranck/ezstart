/**
 * POST /api/quotes/:id/remove-line-item
 * Remove line Item from Quote
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { removeLineItemSchema, paramsMongoIdSchema, quoteSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const removeLineItemFromQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const removeLineItemFromQuoteByIdRouter = createRouterWithDoc(
  removeLineItemFromQuoteByIdRegistry,
  router,
  '/quotes'
)

removeLineItemFromQuoteByIdRouter.post(
  '/:id/remove-line-item',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.removeLineItemFromSecureQuoteController,
  {
    summary: 'Remove line Item from Quote',
    tags: ['Quotes'],
    bodySchema: removeLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
)

export default router
