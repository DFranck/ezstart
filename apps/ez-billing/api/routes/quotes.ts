import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
} from '@ezstart/api-core';
import {
  addLineItemSchema,
  assignClientSchema,
  createQuoteSchema,
  getQuotesQuerySchema,
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

docRouter.post('/quotes/', controllers.createQuoteController, {
  summary: 'Create a Quote',
  tags: ['Quotes'],
  bodySchema: quoteSchema,
  responseSchema: createQuoteSchema,
  status: 201,
});

docRouter.get('/quotes/', validateQuery(getQuotesQuerySchema), {
  summary: 'List Quotes',
  tags: ['Quotes'],
  querySchema: getQuotesQuerySchema,
  responseSchema: quoteSchema.array(),
});

docRouter.get('/quotes/:id', controllers.getQuoteByIdController, {
  summary: 'Get Quote by id',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.put('/quotes/:id', controllers.updateQuoteController, {
  summary: 'Update Quote by id',
  tags: ['Quotes'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.delete('/quotes/:id', controllers.softDeleteQuoteController, {
  summary: 'Soft delete Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/quotes/:id/restore', controllers.restoreQuoteController, {
  summary: 'Restore Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.delete(
  '/quotes/:id/hard-delete',
  controllers.hardDeleteQuoteController,
  {
    summary: 'Hard delete Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  '/quotes/:id/add-line-item',
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
  '/quotes/:id/remove-line-item',
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
  '/quotes/:id/assign-client',
  controllers.assignClientToQuoteController,
  {
    summary: 'Assign Client to Quote',
    tags: ['Quotes'],
    bodySchema: assignClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post('/quotes/:id/accept', controllers.acceptQuoteController, {
  summary: 'Accept a Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});
docRouter.post('/quotes/:id/reject', controllers.rejectQuoteController, {
  summary: 'Reject a Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

export default router;
