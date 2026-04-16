/**
 * PUT /api/quotes/:id
 * Update Quote by id
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema, updateInvoiceSchema, quoteSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const updateQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const updateQuoteByIdRouter = createRouterWithDoc(updateQuoteByIdRegistry, router, '/quotes')

updateQuoteByIdRouter.put(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.updateSecureQuoteController,
  {
    summary: 'Update Quote by id',
    tags: ['Quotes'],
    bodySchema: updateInvoiceSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
)

export default router
