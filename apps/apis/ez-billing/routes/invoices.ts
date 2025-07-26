import {
  addLineItemSchema,
  assignClientSchema,
  clientIdSchema,
  createInvoiceSchema,
  getInvoicesQuerySchema,
  invoiceSchema,
  paramsMongoIdSchema,
  removeLineItemSchema,
  updateInvoiceSchema,
} from '@ezstart/types';
import express, { Router } from 'express';

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
} from '@ezstart/api-core';
import * as controllers from '../controllers/invoice';
export const invoiceRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(invoiceRegistry, router);

docRouter.post('invoices/', controllers.createInvoiceController, {
  summary: 'Create an invoice',
  tags: ['Invoices'],
  bodySchema: invoiceSchema,
  responseSchema: createInvoiceSchema,
  status: 201,
});

docRouter.get('invoices/', validateQuery(getInvoicesQuerySchema), {
  summary: 'List Invoices',
  tags: ['Invoices'],
  querySchema: getInvoicesQuerySchema,
  responseSchema: invoiceSchema.array(),
});

docRouter.get('invoices/:id', controllers.getInvoiceByIdController, {
  summary: 'Get Invoice by id',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.put('invoices/:id', controllers.updateInvoiceController, {
  summary: 'Update Invoice by id',
  tags: ['Invoices'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.delete('invoices/:id', controllers.softDeleteInvoiceController, {
  summary: 'Soft delete Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('invoices/:id/restore', controllers.restoreInvoiceController, {
  summary: 'Restore Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.delete(
  'invoices/:id/hard-delete',
  controllers.hardDeleteInvoiceController,
  {
    summary: 'Hard delete Invoice',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  'invoices/:id/assign-client',
  controllers.assignClientToInvoiceController,
  {
    summary: 'Assign Client to Invoice',
    tags: ['Invoices'],
    bodySchema: assignClientSchema,
    paramsSchema: clientIdSchema,
    responseSchema: invoiceSchema,
  }
);
docRouter.post(
  'invoices/:id/add-line-item',
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
  'invoices/:id/remove-line-item',
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
  'invoices/:id/mark-paid',
  controllers.markInvoiceAsPaidController,
  {
    summary: 'Mark Invoice as paid',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
  }
);

export default router;
