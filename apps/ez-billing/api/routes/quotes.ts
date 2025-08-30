import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
  validateParams,
} from '@ezstart/api-core';
import {
  addLineItemSchema,
  assignClientSchema,
  convertQuoteToInvoiceSchema,
  createQuoteSchema,
  getQuotesQuerySchema,
  invoiceSchema,
  paramsMongoIdSchema,
  quoteSchema,
  removeLineItemSchema,
  updateInvoiceSchema,
} from '@ez-billing/types';
import express, { Router } from 'express';
import * as controllers from '../controllers/quote';

export const quotesRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(quotesRegistry, router);

docRouter.post('/', controllers.createQuoteController, {
  summary: 'Create a Quote',
  tags: ['Quotes'],
  bodySchema: createQuoteSchema,
  responseSchema: quoteSchema,
  status: 201,
});

docRouter.get('/', validateQuery(getQuotesQuerySchema), controllers.getQuotesController, {
  summary: 'List Quotes',
  tags: ['Quotes'],
  querySchema: getQuotesQuerySchema,
  responseSchema: quoteSchema.array(),
});

docRouter.get('/:id', validateParams(paramsMongoIdSchema), controllers.getQuoteByIdController, {
  summary: 'Get Quote by id',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.put('/:id', validateParams(paramsMongoIdSchema), controllers.updateQuoteController, {
  summary: 'Update Quote by id',
  tags: ['Quotes'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.delete('/:id', validateParams(paramsMongoIdSchema), controllers.softDeleteQuoteController, {
  summary: 'Soft delete Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', validateParams(paramsMongoIdSchema), controllers.restoreQuoteController, {
  summary: 'Restore Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  validateParams(paramsMongoIdSchema),
  controllers.hardDeleteQuoteController,
  {
    summary: 'Hard delete Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  '/:id/add-line-item',
  validateParams(paramsMongoIdSchema),
  controllers.addLineItemToQuoteController,
  {
    summary: 'Add line Item to Quote',
    tags: ['Quotes'],
    bodySchema: addLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post(
  '/:id/remove-line-item',
  validateParams(paramsMongoIdSchema),
  controllers.removeLineItemFromQuoteController,
  {
    summary: 'Remove line Item from Quote',
    tags: ['Quotes'],
    bodySchema: removeLineItemSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post(
  '/:id/assign-client',
  validateParams(paramsMongoIdSchema),
  controllers.assignClientToQuoteController,
  {
    summary: 'Assign Client to Quote',
    tags: ['Quotes'],
    bodySchema: assignClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post('/:id/accept', validateParams(paramsMongoIdSchema), controllers.acceptQuoteController, {
  summary: 'Accept a Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});
docRouter.post('/:id/reject', validateParams(paramsMongoIdSchema), controllers.rejectQuoteController, {
  summary: 'Reject a Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});
docRouter.post('/:id/convert-to-invoice', validateParams(paramsMongoIdSchema), controllers.convertQuoteToInvoiceController, {
  summary: 'Convert Quote to Invoice',
  tags: ['Quotes'],
  bodySchema: convertQuoteToInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
  status: 201,
});

export default router;
