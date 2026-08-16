/**
 * DELETE /api/receipts/:id/hard-delete
 * Hard delete Receipt
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const hardDeleteReceiptByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const hardDeleteReceiptByIdRouter = createRouterWithDoc(
  hardDeleteReceiptByIdRegistry,
  router,
  '/receipts'
)

hardDeleteReceiptByIdRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureReceiptController,
  {
    summary: 'Hard delete Receipt',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
