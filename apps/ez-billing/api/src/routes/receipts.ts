import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
  validateParams,
  Router,
} from '@ezstart/express-core';
import {
  addLineItemSchema,
  assignClientSchema,
  createReceiptSchema,
  getReceiptsQuerySchema,
  paramsMongoIdSchema,
  receiptSchema,
  removeLineItemSchema,
  updateReceiptSchema,
} from '@ez-billing/types';
import * as secureControllers from '../controllers/receipt/receipt.secure-controllers.js';
import { authMiddleware } from '../middleware/auth.js';
export const receiptRegistry = new OpenAPIRegistry();
const router = Router();
const docRouter = createRouterWithDoc(receiptRegistry, router);

docRouter.post('/', authMiddleware, secureControllers.createSecureReceiptController, {
  summary: 'Create a Receipt',
  tags: ['Receipts'],
  bodySchema: createReceiptSchema,
  responseSchema: receiptSchema,
  status: 201,
});

docRouter.get('/', authMiddleware, validateQuery(getReceiptsQuerySchema), secureControllers.getSecureReceiptsController, {
  summary: 'List Receipts',
  tags: ['Receipts'],
  querySchema: getReceiptsQuerySchema,
  responseSchema: receiptSchema.array(),
});

docRouter.get('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.getSecureReceiptByIdController, {
  summary: 'Get Receipt by id',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.updateSecureReceiptController, {
  summary: 'Update Receipt by id',
  tags: ['Receipts'],
  bodySchema: updateReceiptSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.softDeleteSecureReceiptController, {
  summary: 'Soft delete Receipt',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.restoreSecureReceiptController, {
  summary: 'Restore Receipt',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureReceiptController,
  {
    summary: 'Hard delete Receipt',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
  }
);

// Custom actions temporarily removed - will be added to secure controllers if needed

export default router;
