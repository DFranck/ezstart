/**
 * POST /api/quotes/:id/restore
 * Restore Quote
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema, quoteSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/quote/quote.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const restoreQuoteByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const restoreQuoteByIdRouter = createRouterWithDoc(
  restoreQuoteByIdRegistry,
  router,
  '/quotes'
);

restoreQuoteByIdRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.restoreSecureQuoteController, {
  summary: 'Restore Quote',
  tags: ['Quotes'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: quoteSchema,
});

export default router;
