/**
 * POST /api/quotes/:id/convert-to-invoice
 * Convert Quote to Invoice
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { convertQuoteToInvoiceSchema, paramsMongoIdSchema, invoiceSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const convertQuoteToInvoiceByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const convertQuoteToInvoiceByIdRouter = createRouterWithDoc(
  convertQuoteToInvoiceByIdRegistry,
  router,
  '/quotes'
)

convertQuoteToInvoiceByIdRouter.post(
  '/:id/convert-to-invoice',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.convertQuoteToInvoiceSecureController,
  {
    summary: 'Convert Quote to Invoice',
    tags: ['Quotes'],
    bodySchema: convertQuoteToInvoiceSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
    status: 201,
  }
)

export default router
