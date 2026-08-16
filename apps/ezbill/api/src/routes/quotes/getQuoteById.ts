/**
 * GET /api/quotes/:id
 * Get Quote by id
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema, quoteSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const getQuoteByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const getQuoteByIdRouter = createRouterWithDoc(getQuoteByIdRegistry, router, '/quotes')

getQuoteByIdRouter.get(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.getSecureQuoteByIdController,
  {
    summary: 'Get Quote by id',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
)

export default router
