/**
 * PUT /api/invoices/:id
 * Update Invoice by id
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { updateInvoiceSchema, paramsMongoIdSchema, invoiceSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const updateInvoiceByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const updateInvoiceByIdRouter = createRouterWithDoc(
  updateInvoiceByIdRegistry,
  router,
  '/invoices'
);

updateInvoiceByIdRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.updateSecureInvoiceController, {
  summary: 'Update Invoice by id',
  tags: ['Invoices'],
  bodySchema: updateInvoiceSchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: invoiceSchema,
});

export default router;
