/**
 * POST /api/receipts/:id/restore
 * Restore Receipt
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema, receiptSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const restoreReceiptByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const restoreReceiptByIdRouter = createRouterWithDoc(
  restoreReceiptByIdRegistry,
  router,
  '/receipts'
);

restoreReceiptByIdRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.restoreSecureReceiptController, {
  summary: 'Restore Receipt',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

export default router;
