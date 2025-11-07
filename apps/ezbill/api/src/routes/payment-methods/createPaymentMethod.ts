/**
 * POST /api/payment-methods
 * Create Payment Method (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { paymentMethodSchema, createPaymentMethodSchema } from '@ezbill/types';
import { createPaymentMethod } from '../../controllers/payment-method/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const createPaymentMethodRegistry = new OpenAPIRegistry();
const router = Router();
export const createPaymentMethodRouter = createRouterWithDoc(
  createPaymentMethodRegistry,
  router,
  '/payment-methods'
);

createPaymentMethodRouter.post('/', authMiddleware, createPaymentMethod, {
  summary: 'Create Payment Method (authenticated)',
  tags: ['Payment Methods'],
  bodySchema: createPaymentMethodSchema,
  responseSchema: paymentMethodSchema,
  status: 201,
});

export default router;
