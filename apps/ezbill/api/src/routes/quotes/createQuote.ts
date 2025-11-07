/**
 * POST /api/quotes
 * Create a Quote
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { createQuoteSchema, quoteSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const createQuoteRegistry = new OpenAPIRegistry();
const router = Router();
export const createQuoteRouter = createRouterWithDoc(
  createQuoteRegistry,
  router,
  '/quotes'
);

createQuoteRouter.post('/', authMiddleware, secureControllers.createSecureQuoteController, {
  summary: 'Create a Quote',
  tags: ['Quotes'],
  bodySchema: createQuoteSchema,
  responseSchema: quoteSchema,
  status: 201,
});

export default router;
