/**
 * POST /api/quotes/:id/reject
 * Reject a Quote
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

export const rejectQuoteByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const rejectQuoteByIdRouter = createRouterWithDoc(
  rejectQuoteByIdRegistry,
  router,
  '/quotes'
);

rejectQuoteByIdRouter.post(
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

export default router;
