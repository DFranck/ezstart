/**
 * DELETE /api/invoices/:id/hard-delete
 * Hard delete Invoice
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const hardDeleteInvoiceByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const hardDeleteInvoiceByIdRouter = createRouterWithDoc(
  hardDeleteInvoiceByIdRegistry,
  router,
  '/invoices'
)

hardDeleteInvoiceByIdRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureInvoiceController,
  {
    summary: 'Hard delete Invoice',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
