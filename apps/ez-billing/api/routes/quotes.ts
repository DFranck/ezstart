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
import * as secureControllers from '../controllers/quote/quote.secure-controllers';
import { authMiddleware } from '../middleware/auth';

export const quotesRegistry = new OpenAPIRegistry();
const router: Router = express.Router();
const docRouter = createRouterWithDoc(quotesRegistry, router);

docRouter.post('/', authMiddleware, secureControllers.createSecureQuoteController, {
  summary: 'Create a Quote',
  tags: ['Quotes'],
  bodySchema: createQuoteSchema,
  responseSchema: quoteSchema,
  status: 201,
});

docRouter.get('/', authMiddleware, validateQuery(getQuotesQuerySchema), secureControllers.getSecureQuotesController, {
  summary: 'List Quotes',
  tags: ['Quotes'],
  querySchema: getQuotesQuerySchema,
  responseSchema: quoteSchema.array(),
});

docRouter.get('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.getSecureQuoteByIdController, {
  summary: 'Get Quote by id',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.updateSecureQuoteController, {
  summary: 'Update Quote by id',
  tags: ['Quotes'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.softDeleteSecureQuoteController, {
  summary: 'Soft delete Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
});

docRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.restoreSecureQuoteController, {
  summary: 'Restore Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

docRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureQuoteController,
  {
    summary: 'Hard delete Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
  }
);

docRouter.post(
  '/:id/add-line-item',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.addLineItemToSecureQuoteController,
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
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.removeLineItemFromSecureQuoteController,
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
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.assignClientToSecureQuoteController,
  {
    summary: 'Assign Client to Quote',
    tags: ['Quotes'],
    bodySchema: assignClientSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post(
  '/:id/accept', 
  authMiddleware,
  validateParams(paramsMongoIdSchema), 
  secureControllers.acceptSecureQuoteController, 
  {
    summary: 'Accept a Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post(
  '/:id/reject', 
  authMiddleware,
  validateParams(paramsMongoIdSchema), 
  secureControllers.rejectSecureQuoteController, 
  {
    summary: 'Reject a Quote',
    tags: ['Quotes'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: quoteSchema,
  }
);
docRouter.post(
  '/:id/convert-to-invoice', 
  authMiddleware,
  validateParams(paramsMongoIdSchema), 
  secureControllers.convertQuoteToInvoiceSecureController, 
  {
    summary: 'Convert Quote to Invoice',
    tags: ['Quotes'],
    bodySchema: convertQuoteToInvoiceSchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: invoiceSchema,
    status: 201,
  }
);

export default router;
