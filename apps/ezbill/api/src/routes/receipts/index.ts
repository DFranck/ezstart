/**
 * Receipts Feature Router
 *
 * Consolidates all receipt-related actions into a single router.
 *
 * Routes:
 * - POST   /api/receipts                    -> createReceipt
 * - GET    /api/receipts                    -> listReceipts
 * - GET    /api/receipts/:id                -> getReceiptById
 * - PUT    /api/receipts/:id                -> updateReceiptById
 * - DELETE /api/receipts/:id                -> deleteReceiptById
 * - POST   /api/receipts/:id/restore        -> restoreReceiptById
 * - DELETE /api/receipts/:id/hard-delete    -> hardDeleteReceiptById
 */

import { Router } from '@ezstart/express-core'

// Import action routers
import createReceiptRouter, { createReceiptRegistry } from './createReceipt.js'
import listReceiptsRouter, { listReceiptsRegistry } from './listReceipts.js'
import getReceiptByIdRouter, { getReceiptByIdRegistry } from './getReceiptById.js'
import updateReceiptByIdRouter, { updateReceiptByIdRegistry } from './updateReceiptById.js'
import deleteReceiptByIdRouter, { deleteReceiptByIdRegistry } from './deleteReceiptById.js'
import restoreReceiptByIdRouter, { restoreReceiptByIdRegistry } from './restoreReceiptById.js'
import hardDeleteReceiptByIdRouter, {
  hardDeleteReceiptByIdRegistry,
} from './hardDeleteReceiptById.js'

// Export all registries as an array for OpenAPI documentation
export const receiptsRegistries = [
  createReceiptRegistry,
  listReceiptsRegistry,
  getReceiptByIdRegistry,
  updateReceiptByIdRegistry,
  deleteReceiptByIdRegistry,
  restoreReceiptByIdRegistry,
  hardDeleteReceiptByIdRegistry,
]

// Consolidate all receipt routers
const router: import('express').Router = Router()

router
  .use('/', createReceiptRouter)
  .use('/', listReceiptsRouter)
  .use('/', getReceiptByIdRouter)
  .use('/', updateReceiptByIdRouter)
  .use('/', deleteReceiptByIdRouter)
  .use('/', restoreReceiptByIdRouter)
  .use('/', hardDeleteReceiptByIdRouter)

export default router
