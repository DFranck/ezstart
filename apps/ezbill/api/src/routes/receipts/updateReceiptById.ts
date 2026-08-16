/**
 * PUT /api/receipts/:id
 * Update Receipt by id
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { updateReceiptSchema, paramsMongoIdSchema, receiptSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const updateReceiptByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const updateReceiptByIdRouter = createRouterWithDoc(
  updateReceiptByIdRegistry,
  router,
  '/receipts'
)

updateReceiptByIdRouter.put(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.updateSecureReceiptController,
  {
    summary: 'Update Receipt by id',
    tags: ['Receipts'],
    bodySchema: updateReceiptSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
)

export default router
