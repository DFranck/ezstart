/**
 * GET /api/quotes
 * List Quotes
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateQuery } from '@ezstart/api-core'
import { getQuotesQuerySchema, quoteSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const listQuotesRegistry = new OpenAPIRegistry()
const router = Router()
export const listQuotesRouter = createRouterWithDoc(listQuotesRegistry, router, '/quotes')

listQuotesRouter.get(
  '/',
  authMiddleware,
  validateQuery(getQuotesQuerySchema),
  secureControllers.getSecureQuotesController,
  {
    summary: 'List Quotes',
    tags: ['Quotes'],
    querySchema: getQuotesQuerySchema,
    responseSchema: quoteSchema.array(),
  }
)

export default router
