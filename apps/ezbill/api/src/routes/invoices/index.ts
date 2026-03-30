/**
 * Invoices Feature Router
 *
 * Consolidates all invoice-related actions into a single router.
 *
 * Routes:
 * - POST   /api/invoices                  -> createInvoice
 * - GET    /api/invoices                  -> listInvoices
 * - GET    /api/invoices/:id              -> getInvoiceById
 * - PUT    /api/invoices/:id              -> updateInvoiceById
 * - DELETE /api/invoices/:id              -> deleteInvoiceById
 * - POST   /api/invoices/:id/restore      -> restoreInvoiceById
 * - DELETE /api/invoices/:id/hard-delete  -> hardDeleteInvoiceById
 * - POST   /api/invoices/:id/mark-paid    -> markInvoiceAsPaidById
 */

import { Router } from '@ezstart/express-core'

// Import action routers
import createInvoiceRouter, { createInvoiceRegistry } from './createInvoice.js'
import listInvoicesRouter, { listInvoicesRegistry } from './listInvoices.js'
import getInvoiceByIdRouter, { getInvoiceByIdRegistry } from './getInvoiceById.js'
import updateInvoiceByIdRouter, { updateInvoiceByIdRegistry } from './updateInvoiceById.js'
import deleteInvoiceByIdRouter, { deleteInvoiceByIdRegistry } from './deleteInvoiceById.js'
import restoreInvoiceByIdRouter, { restoreInvoiceByIdRegistry } from './restoreInvoiceById.js'
import hardDeleteInvoiceByIdRouter, {
  hardDeleteInvoiceByIdRegistry,
} from './hardDeleteInvoiceById.js'
import markInvoiceAsPaidByIdRouter, {
  markInvoiceAsPaidByIdRegistry,
} from './markInvoiceAsPaidById.js'

// Export all registries as an array for OpenAPI documentation
export const invoicesRegistries = [
  createInvoiceRegistry,
  listInvoicesRegistry,
  getInvoiceByIdRegistry,
  updateInvoiceByIdRegistry,
  deleteInvoiceByIdRegistry,
  restoreInvoiceByIdRegistry,
  hardDeleteInvoiceByIdRegistry,
  markInvoiceAsPaidByIdRegistry,
]

// Consolidate all invoice routers
const router: import('express').Router = Router()

router
  .use('/', createInvoiceRouter)
  .use('/', listInvoicesRouter)
  .use('/', getInvoiceByIdRouter)
  .use('/', updateInvoiceByIdRouter)
  .use('/', deleteInvoiceByIdRouter)
  .use('/', restoreInvoiceByIdRouter)
  .use('/', hardDeleteInvoiceByIdRouter)
  .use('/', markInvoiceAsPaidByIdRouter)

export default router
