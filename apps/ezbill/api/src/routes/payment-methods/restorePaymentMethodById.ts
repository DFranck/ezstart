/**
 * POST /api/payment-methods/:id/restore
 * Restore Payment Method (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paymentMethodSchema, paramsMongoIdSchema } from '@ezbill/types';
import { restorePaymentMethod } from '../../controllers/payment-method/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const restorePaymentMethodByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const restorePaymentMethodByIdRouter = createRouterWithDoc(
  restorePaymentMethodByIdRegistry,
  router,
  '/payment-methods'
);

restorePaymentMethodByIdRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), restorePaymentMethod, {
  summary: 'Restore Payment Method (authenticated)',
  tags: ['Payment Methods'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: paymentMethodSchema,
});

export default router;
