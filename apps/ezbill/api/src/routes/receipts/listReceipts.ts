/**
 * GET /api/receipts
 * List Receipts
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
} from '@ezstart/express-core';
import { getReceiptsQuerySchema, receiptSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/receipt/receipt.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const listReceiptsRegistry = new OpenAPIRegistry();
const router = Router();
export const listReceiptsRouter = createRouterWithDoc(
  listReceiptsRegistry,
  router,
  '/receipts'
);

listReceiptsRouter.get('/', authMiddleware, validateQuery(getReceiptsQuerySchema), secureControllers.getSecureReceiptsController, {
  summary: 'List Receipts',
  tags: ['Receipts'],
  querySchema: getReceiptsQuerySchema,
  responseSchema: receiptSchema.array(),
});

export default router;
