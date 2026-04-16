/**
 * GET /api/payment-methods/:id
 * Get Payment Method by ID (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paymentMethodSchema, paramsMongoIdSchema } from '@ezbill/types'
import { getPaymentMethodById } from '../../controllers/payment-method/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const getPaymentMethodByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const getPaymentMethodByIdRouter = createRouterWithDoc(
  getPaymentMethodByIdRegistry,
  router,
  '/payment-methods'
)

getPaymentMethodByIdRouter.get(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  getPaymentMethodById,
  {
    summary: 'Get Payment Method by ID (authenticated)',
    tags: ['Payment Methods'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: paymentMethodSchema,
  }
)

export default router
