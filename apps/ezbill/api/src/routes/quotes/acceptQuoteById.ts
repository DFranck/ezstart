/**
 * POST /api/quotes/:id/accept
 * Accept a Quote
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema, quoteSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const acceptQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const acceptQuoteByIdRouter = createRouterWithDoc(acceptQuoteByIdRegistry, router, '/quotes')

acceptQuoteByIdRouter.post(
  '/:id/accept',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.acceptSecureQuoteController,
  {
    summary: 'Accept a Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
)

export default router
