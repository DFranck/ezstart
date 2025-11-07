/**
 * DELETE /api/receipts/:id
 * Soft delete Receipt
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const deleteReceiptByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const deleteReceiptByIdRouter = createRouterWithDoc(
  deleteReceiptByIdRegistry,
  router,
  '/receipts'
);

deleteReceiptByIdRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.softDeleteSecureReceiptController, {
  summary: 'Soft delete Receipt',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
});

export default router;
