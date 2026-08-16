/**
 * POST /api/invoices/:id/restore
 * Restore Invoice
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema, invoiceSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const restoreInvoiceByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const restoreInvoiceByIdRouter = createRouterWithDoc(
  restoreInvoiceByIdRegistry,
  router,
  '/invoices'
)

restoreInvoiceByIdRouter.post(
  '/:id/restore',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.restoreSecureInvoiceController,
  {
    summary: 'Restore Invoice',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
  }
)

export default router
