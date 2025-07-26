import {
  createInvoiceSchema,
  getInvoicesQuerySchema,
  invoiceSchema,
  paramsMongoIdSchema,
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
  summary: 'List invoices',
  tags: ['Invoices'],
  querySchema: getInvoicesQuerySchema,
  responseSchema: invoiceSchema.array(),
});

docRouter.get('invoices/:id', controllers.getInvoiceByIdController, {
  summary: 'Get invoice by id',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.put('invoices/:id', controllers.updateInvoiceController, {
  summary: 'Update invoice by id',
  tags: ['Invoices'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

router
  // .post('/', controllers.createInvoiceController)
  // .get(
  //   '/',
  //   validateQuery(getInvoicesQuerySchema),
  //   controllers.getInvoicesController
  // )
  // .get('/:id', controllers.getInvoiceByIdController)
  // .put('/:id', controllers.updateInvoiceController)
  .delete('/:id', controllers.softDeleteInvoiceController)
  .post('/:id/restore', controllers.restoreInvoiceController)
  .delete('/:id/hard-delete', controllers.hardDeleteInvoiceController)

  // Relations & actions
  .post('/:id/assign-client', controllers.assignClientToInvoiceController)
  .post('/:id/add-line-item', controllers.addLineItemToInvoiceController)
  .post('/:id/remove-line-item', controllers.removeLineItemToInvoiceController)
  // Special
  .post('/:id/mark-paid', controllers.markInvoiceAsPaidController);

export default router;
