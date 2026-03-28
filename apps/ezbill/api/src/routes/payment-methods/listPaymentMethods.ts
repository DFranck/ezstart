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
import { z } from 'zod';
import { getPaymentMethods } from '../../controllers/payment-method/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const listPaymentMethodsRegistry = new OpenAPIRegistry();
const router = Router();
export const listPaymentMethodsRouter = createRouterWithDoc(
  listPaymentMethodsRegistry,
  router,
  '/payment-methods'
);

const paginatedPaymentMethodsSchema = z.object({
  data: paymentMethodSchema.array().describe('Array of payment methods'),
  pagination: z.object({
    page: z.number().describe('Current page number'),
    limit: z.number().describe('Items per page'),
    total: z.number().describe('Total number of items'),
    totalPages: z.number().describe('Total number of pages'),
  }).describe('Pagination metadata'),
});

listPaymentMethodsRouter.get('/', authMiddleware, getPaymentMethods, {
  summary: 'List Payment Methods (authenticated)',
  tags: ['Payment Methods'],
  responseSchema: paginatedPaymentMethodsSchema,
});

export default router;
