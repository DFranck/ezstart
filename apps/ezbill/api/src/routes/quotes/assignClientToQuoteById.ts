/**
 * POST /api/quotes/:id/assign-client
 * Assign Client to Quote
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { assignClientSchema, paramsMongoIdSchema, quoteSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const assignClientToQuoteByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const assignClientToQuoteByIdRouter = createRouterWithDoc(
  assignClientToQuoteByIdRegistry,
  router,
  '/quotes'
);

assignClientToQuoteByIdRouter.post(
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

export default router;
