/**
 * POST /api/invoices/:id/mark-paid
 * Mark Invoice as Paid
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const markInvoiceAsPaidByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const markInvoiceAsPaidByIdRouter = createRouterWithDoc(
  markInvoiceAsPaidByIdRegistry,
  router,
  '/invoices'
)

markInvoiceAsPaidByIdRouter.post(
  '/:id/mark-paid',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.markInvoiceAsPaidSecureController,
  {
    summary: 'Mark Invoice as Paid',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
