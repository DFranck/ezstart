import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
  validateParams,
} from '@ezstart/api-core';
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
import express, { Router } from 'express';
import * as controllers from '../controllers/receipt';
export const receiptRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(receiptRegistry, router);

docRouter.post('/', controllers.createReceiptController, {
  summary: 'Create a Receipt',
  tags: ['Receipts'],
  bodySchema: createReceiptSchema,
  responseSchema: receiptSchema,
  status: 201,
});

docRouter.get('/', validateQuery(getReceiptsQuerySchema), controllers.getReceiptsController, {
  summary: 'List Receipts',
  tags: ['Receipts'],
  querySchema: getReceiptsQuerySchema,
  responseSchema: receiptSchema.array(),
});

docRouter.get('/:id', validateParams(paramsMongoIdSchema), controllers.getReceiptByIdController, {
  summary: 'Get Receipt by id',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.put('/:id', validateParams(paramsMongoIdSchema), controllers.updateReceiptController, {
  summary: 'Update Receipt by id',
  tags: ['Receipts'],
  bodySchema: updateReceiptSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.delete('/:id', validateParams(paramsMongoIdSchema), controllers.softDeleteReceiptController, {
  summary: 'Soft delete Receipt',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', validateParams(paramsMongoIdSchema), controllers.restoreReceiptController, {
  summary: 'Restore Receipt',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  validateParams(paramsMongoIdSchema),
  controllers.hardDeleteReceiptController,
  {
    summary: 'Hard delete Receipt',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  '/:id/add-line-item',
  validateParams(paramsMongoIdSchema),
  controllers.addLineItemToReceiptController,
  {
    summary: 'Add line Item to Receipt',
    tags: ['Receipts'],
    bodySchema: addLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/:id/remove-line-item',
  validateParams(paramsMongoIdSchema),
  controllers.removeLineItemFromReceiptController,
  {
    summary: 'Remove line Item from Receipt',
    tags: ['Receipts'],
    bodySchema: removeLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/:id/assign-client',
  validateParams(paramsMongoIdSchema),
  controllers.assignClientToReceiptController,
  {
    summary: 'Assign Client to Receipt',
    tags: ['Receipts'],
    bodySchema: assignClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/:id/mark-issued',
  validateParams(paramsMongoIdSchema),
  controllers.markReceiptAsIssuedController,
  {
    summary: 'Mark Receipt as Issued',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/:id/mark-refunded',
  validateParams(paramsMongoIdSchema),
  controllers.markReceiptAsRefundedController,
  {
    summary: 'Mark Receipt as Refunded',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);

export default router;
