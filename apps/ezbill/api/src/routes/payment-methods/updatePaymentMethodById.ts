/**
 * PUT /api/payment-methods/:id
 * Update Payment Method (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paymentMethodSchema, createPaymentMethodSchema, paramsMongoIdSchema } from '@ezbill/types';
import { updatePaymentMethod } from '../../controllers/payment-method/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const updatePaymentMethodByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const updatePaymentMethodByIdRouter = createRouterWithDoc(
  updatePaymentMethodByIdRegistry,
  router,
  '/payment-methods'
);

updatePaymentMethodByIdRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), updatePaymentMethod, {
  summary: 'Update Payment Method (authenticated)',
  tags: ['Payment Methods'],
  bodySchema: createPaymentMethodSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: paymentMethodSchema,
});

export default router;
