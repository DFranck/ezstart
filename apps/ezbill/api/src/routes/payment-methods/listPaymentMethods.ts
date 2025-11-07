/**
 * GET /api/payment-methods
 * List Payment Methods (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { paymentMethodSchema } from '@ezbill/types';
import { getPaymentMethods } from '../../controllers/payment-method/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const listPaymentMethodsRegistry = new OpenAPIRegistry();
const router = Router();
export const listPaymentMethodsRouter = createRouterWithDoc(
  listPaymentMethodsRegistry,
  router,
  '/payment-methods'
);

listPaymentMethodsRouter.get('/', authMiddleware, getPaymentMethods, {
  summary: 'List Payment Methods (authenticated)',
  tags: ['Payment Methods'],
  responseSchema: paymentMethodSchema.array(),
});

export default router;
