/**
 * Payment Methods Feature Router
 *
 * Consolidates all payment-method-related actions into a single router.
 *
 * Routes:
 * - GET    /api/payment-methods            -> listPaymentMethods
 * - GET    /api/payment-methods/:id        -> getPaymentMethodById
 * - POST   /api/payment-methods            -> createPaymentMethod
 * - PUT    /api/payment-methods/:id        -> updatePaymentMethodById
 * - POST   /api/payment-methods/:id/restore -> restorePaymentMethodById
 * - DELETE /api/payment-methods/:id        -> deletePaymentMethodById
 */

import { Router } from '@ezstart/express-core'

// Import action routers
import listPaymentMethodsRouter, { listPaymentMethodsRegistry } from './listPaymentMethods.js'
import getPaymentMethodByIdRouter, { getPaymentMethodByIdRegistry } from './getPaymentMethodById.js'
import createPaymentMethodRouter, { createPaymentMethodRegistry } from './createPaymentMethod.js'
import updatePaymentMethodByIdRouter, {
  updatePaymentMethodByIdRegistry,
} from './updatePaymentMethodById.js'
import restorePaymentMethodByIdRouter, {
  restorePaymentMethodByIdRegistry,
} from './restorePaymentMethodById.js'
import deletePaymentMethodByIdRouter, {
  deletePaymentMethodByIdRegistry,
} from './deletePaymentMethodById.js'

// Export all registries as an array for OpenAPI documentation
export const paymentMethodsRegistries = [
  listPaymentMethodsRegistry,
  getPaymentMethodByIdRegistry,
  createPaymentMethodRegistry,
  updatePaymentMethodByIdRegistry,
  restorePaymentMethodByIdRegistry,
  deletePaymentMethodByIdRegistry,
]

// Consolidate all payment method routers
const router: import('express').Router = Router()

router
  .use('/', listPaymentMethodsRouter)
  .use('/', getPaymentMethodByIdRouter)
  .use('/', createPaymentMethodRouter)
  .use('/', updatePaymentMethodByIdRouter)
  .use('/', restorePaymentMethodByIdRouter)
  .use('/', deletePaymentMethodByIdRouter)

export default router
