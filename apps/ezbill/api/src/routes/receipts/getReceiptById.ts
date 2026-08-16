/**
 * GET /api/receipts/:id
 * Get Receipt by id
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema, receiptSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const getReceiptByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const getReceiptByIdRouter = createRouterWithDoc(getReceiptByIdRegistry, router, '/receipts')

getReceiptByIdRouter.get(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.getSecureReceiptByIdController,
  {
    summary: 'Get Receipt by id',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
)

export default router
