/**
 * POST /api/quotes/:id/add-line-item
 * Add line Item to Quote
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { addLineItemSchema, paramsMongoIdSchema, quoteSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const addLineItemToQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const addLineItemToQuoteByIdRouter = createRouterWithDoc(
  addLineItemToQuoteByIdRegistry,
  router,
  '/quotes'
)

addLineItemToQuoteByIdRouter.post(
  '/:id/add-line-item',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.addLineItemToSecureQuoteController,
  {
    summary: 'Add line Item to Quote',
    tags: ['Quotes'],
    bodySchema: addLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
)

export default router
