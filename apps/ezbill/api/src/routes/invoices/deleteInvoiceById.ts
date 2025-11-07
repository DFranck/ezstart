/**
 * DELETE /api/invoices/:id
 * Soft delete Invoice
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { paramsMongoIdSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const deleteInvoiceByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const deleteInvoiceByIdRouter = createRouterWithDoc(
  deleteInvoiceByIdRegistry,
  router,
  '/invoices'
);

deleteInvoiceByIdRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), secureControllers.softDeleteSecureInvoiceController, {
  summary: 'Soft delete Invoice',
  tags: ['Invoices'],
  paramsSchema: paramsMongoIdSchema,
});

export default router;
