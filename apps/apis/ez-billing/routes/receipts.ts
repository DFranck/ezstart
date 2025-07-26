import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
} from '@ezstart/api-core';
import {
  addLineItemSchema,
  assignClientSchema,
  createQuoteSchema,
  getReceiptsQuerySchema,
  paramsMongoIdSchema,
  receiptSchema,
  removeLineItemSchema,
  updateInvoiceSchema,
} from '@ezstart/types';
import express, { Router } from 'express';
import * as controllers from '../controllers/receipt';
export const receiptRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(receiptRegistry, router);

docRouter.post('/receipts/', controllers.createReceiptController, {
  summary: 'Create a Quote',
  tags: ['Receipts'],
  bodySchema: receiptSchema,
  responseSchema: createQuoteSchema,
  status: 201,
});

docRouter.get('/receipts/', validateQuery(getReceiptsQuerySchema), {
  summary: 'List Receipts',
  tags: ['Receipts'],
  querySchema: getReceiptsQuerySchema,
  responseSchema: receiptSchema.array(),
});

docRouter.get('/receipts/:id', controllers.getReceiptByIdController, {
  summary: 'Get Quote by id',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.put('/receipts/:id', controllers.updateReceiptController, {
  summary: 'Update Quote by id',
  tags: ['Receipts'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.delete('/receipts/:id', controllers.softDeleteReceiptController, {
  summary: 'Soft delete Quote',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/receipts/:id/restore', controllers.restoreReceiptController, {
  summary: 'Restore Quote',
  tags: ['Receipts'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: receiptSchema,
});

docRouter.delete(
  '/receipts/:id/hard-delete',
  controllers.hardDeleteReceiptController,
  {
    summary: 'Hard delete Quote',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  '/receipts/:id/add-line-item',
  controllers.addLineItemToReceiptController,
  {
    summary: 'Add line Item to Quote',
    tags: ['Receipts'],
    bodySchema: addLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/receipts/:id/remove-line-item',
  controllers.removeLineItemFromReceiptController,
  {
    summary: 'Remove line Item from Quote',
    tags: ['Receipts'],
    bodySchema: removeLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/receipts/:id/assign-client',
  controllers.assignClientToReceiptController,
  {
    summary: 'Assign Client to Quote',
    tags: ['Receipts'],
    bodySchema: assignClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/receipts/:id/mark-issued',
  controllers.markReceiptAsIssuedController,
  {
    summary: 'Accept a Quote',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);
docRouter.post(
  '/receipts/:id/mark-refunded',
  controllers.markReceiptAsRefundedController,
  {
    summary: 'Reject a Quote',
    tags: ['Receipts'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: receiptSchema,
  }
);

export default router;
