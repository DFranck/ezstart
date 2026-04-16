/**
 * DELETE /api/payment-methods/:id
 * Soft delete Payment Method (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import { deletePaymentMethod } from '../../controllers/payment-method/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const deletePaymentMethodByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const deletePaymentMethodByIdRouter = createRouterWithDoc(
  deletePaymentMethodByIdRegistry,
  router,
  '/payment-methods'
)

deletePaymentMethodByIdRouter.delete(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  deletePaymentMethod,
  {
    summary: 'Soft delete Payment Method (authenticated)',
    tags: ['Payment Methods'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
