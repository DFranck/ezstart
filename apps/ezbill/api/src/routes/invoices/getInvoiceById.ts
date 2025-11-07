/**
 * GET /api/invoices/:id
 * Get Invoice by id
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema, invoiceSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const getInvoiceByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const getInvoiceByIdRouter = createRouterWithDoc(
  getInvoiceByIdRegistry,
  router,
  '/invoices'
);

getInvoiceByIdRouter.get('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.getSecureInvoiceByIdController, {
  summary: 'Get Invoice by id',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

export default router;
