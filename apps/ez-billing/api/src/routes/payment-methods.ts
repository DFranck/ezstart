import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
} from '@ezstart/express-core'
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getPaymentMethodById,
  restorePaymentMethod,
  updatePaymentMethod,
} from '../controllers/payment-method/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  paymentMethodSchema,
  createPaymentMethodSchema,
  paramsMongoIdSchema,
} from '@ez-billing/types'

export const paymentMethodsRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(paymentMethodsRegistry, router, '/payment-methods')

// Protected routes with authentication and OpenAPI documentation
docRouter.get('/', authMiddleware, getPaymentMethods, {
  summary: 'List Payment Methods (authenticated)',
  tags: ['Payment Methods'],
  responseSchema: paymentMethodSchema.array(),
})

docRouter.get('/:id', authMiddleware, validateParams(paramsMongoIdSchema), getPaymentMethodById, {
  summary: 'Get Payment Method by ID (authenticated)',
  tags: ['Payment Methods'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: paymentMethodSchema,
})

docRouter.post('/', authMiddleware, createPaymentMethod, {
  summary: 'Create Payment Method (authenticated)',
  tags: ['Payment Methods'],
  bodySchema: createPaymentMethodSchema,
  responseSchema: paymentMethodSchema,
  status: 201,
})

docRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), updatePaymentMethod, {
  summary: 'Update Payment Method (authenticated)',
  tags: ['Payment Methods'],
  bodySchema: createPaymentMethodSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: paymentMethodSchema,
})

docRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), restorePaymentMethod, {
  summary: 'Restore Payment Method (authenticated)',
  tags: ['Payment Methods'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: paymentMethodSchema,
})

docRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), deletePaymentMethod, {
  summary: 'Soft delete Payment Method (authenticated)',
  tags: ['Payment Methods'],
  paramsSchema: paramsMongoIdSchema,
})

export default router