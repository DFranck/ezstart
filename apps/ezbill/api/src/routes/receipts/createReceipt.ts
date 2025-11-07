/**
 * POST /api/receipts
 * Create a Receipt
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { createReceiptSchema, receiptSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const createReceiptRegistry = new OpenAPIRegistry();
const router = Router();
export const createReceiptRouter = createRouterWithDoc(
  createReceiptRegistry,
  router,
  '/receipts'
);

createReceiptRouter.post('/', authMiddleware, secureControllers.createSecureReceiptController, {
  summary: 'Create a Receipt',
  tags: ['Receipts'],
  bodySchema: createReceiptSchema,
  responseSchema: receiptSchema,
  status: 201,
});

export default router;
