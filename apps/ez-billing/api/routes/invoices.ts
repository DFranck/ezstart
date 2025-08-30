import {
  addLineItemSchema,
  assignClientSchema,
  createInvoiceSchema,
  getInvoicesQuerySchema,
  invoiceSchema,
  paramsMongoIdSchema,
  removeLineItemSchema,
  updateInvoiceSchema,
} from '@ez-billing/types';
import express, { Router } from 'express';

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
  validateParams,
} from '@ezstart/api-core';
import * as controllers from '../controllers/invoice';
export const invoiceRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(invoiceRegistry, router);

docRouter.post('/', controllers.createInvoiceController, {
  summary: 'Create an Invoice',
  tags: ['Invoices'],
  bodySchema: createInvoiceSchema,
  responseSchema: invoiceSchema,
  status: 201,
});

docRouter.get('/', validateQuery(getInvoicesQuerySchema), controllers.getInvoicesController, {
  summary: 'List Invoices',
  tags: ['Invoices'],
  querySchema: getInvoicesQuerySchema,
  responseSchema: invoiceSchema.array(),
});

docRouter.get('/:id', validateParams(paramsMongoIdSchema), controllers.getInvoiceByIdController, {
  summary: 'Get Invoice by id',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.put('/:id', validateParams(paramsMongoIdSchema), controllers.updateInvoiceController, {
  summary: 'Update Invoice by id',
  tags: ['Invoices'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.delete('/:id', validateParams(paramsMongoIdSchema), controllers.softDeleteInvoiceController, {
  summary: 'Soft delete Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', validateParams(paramsMongoIdSchema), controllers.restoreInvoiceController, {
  summary: 'Restore Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  validateParams(paramsMongoIdSchema),
  controllers.hardDeleteInvoiceController,
  {
    summary: 'Hard delete Invoice',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  '/:id/add-line-item',
  validateParams(paramsMongoIdSchema),
  controllers.addLineItemToInvoiceController,
  {
    summary: 'Add line Item to Invoice',
    tags: ['Invoices'],
    bodySchema: addLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
  }
);
docRouter.post(
  '/:id/remove-line-item',
  validateParams(paramsMongoIdSchema),
  controllers.removeLineItemToInvoiceController,
  {
    summary: 'Remove line Item from Invoice',
    tags: ['Invoices'],
    bodySchema: removeLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
  }
);
docRouter.post(
  '/:id/mark-paid',
  validateParams(paramsMongoIdSchema),
  controllers.markInvoiceAsPaidController,
  {
    summary: 'Mark Invoice as paid',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
  }
);
docRouter.post(
  '/:id/assign-client',
  validateParams(paramsMongoIdSchema),
  controllers.assignClientToInvoiceController,
  {
    summary: 'Assign Client to Invoice',
    tags: ['Invoices'],
    bodySchema: assignClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
  }
);

export default router;
