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
import * as secureControllers from '../controllers/invoice/invoice.secure-controllers';
import { authMiddleware } from '../middleware/auth';
export const invoiceRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(invoiceRegistry, router);

docRouter.post('/', authMiddleware, secureControllers.createSecureInvoiceController, {
  summary: 'Create an Invoice',
  tags: ['Invoices'],
  bodySchema: createInvoiceSchema,
  responseSchema: invoiceSchema,
  status: 201,
});

docRouter.get('/', authMiddleware, validateQuery(getInvoicesQuerySchema), secureControllers.getSecureInvoicesController, {
  summary: 'List Invoices',
  tags: ['Invoices'],
  querySchema: getInvoicesQuerySchema,
  responseSchema: invoiceSchema.array(),
});

docRouter.get('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.getSecureInvoiceByIdController, {
  summary: 'Get Invoice by id',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.updateSecureInvoiceController, {
  summary: 'Update Invoice by id',
  tags: ['Invoices'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.softDeleteSecureInvoiceController, {
  summary: 'Soft delete Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.restoreSecureInvoiceController, {
  summary: 'Restore Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureInvoiceController,
  {
    summary: 'Hard delete Invoice',
    tags: ['Invoices'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post('/:id/mark-paid', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.markInvoiceAsPaidSecureController, {
  summary: 'Mark Invoice as Paid',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
});

// Custom actions temporarily removed - will be added to secure controllers if needed

export default router;
