/**
 * GET /api/invoices
 * List Invoices
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateQuery } from '@ezstart/api-core'
import { getInvoicesQuerySchema, invoiceSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const listInvoicesRegistry = new OpenAPIRegistry()
const router = Router()
export const listInvoicesRouter = createRouterWithDoc(listInvoicesRegistry, router, '/invoices')

listInvoicesRouter.get(
  '/',
  authMiddleware,
  validateQuery(getInvoicesQuerySchema),
  secureControllers.getSecureInvoicesController,
  {
    summary: 'List Invoices',
    tags: ['Invoices'],
    querySchema: getInvoicesQuerySchema,
    responseSchema: invoiceSchema.array(),
  }
)

export default router
