/**
 * POST /api/invoices
 * Create an Invoice
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { createInvoiceSchema, invoiceSchema } from '@ezbill/types';
import * as secureControllers from '../../controllers/invoice/invoice.secure-controllers.js';
import { authMiddleware } from '../../middleware/auth.js';

export const createInvoiceRegistry = new OpenAPIRegistry();
const router = Router();
export const createInvoiceRouter = createRouterWithDoc(
  createInvoiceRegistry,
  router,
  '/invoices'
);

createInvoiceRouter.post('/', authMiddleware, secureControllers.createSecureInvoiceController, {
  summary: 'Create an Invoice',
  tags: ['Invoices'],
  bodySchema: createInvoiceSchema,
  responseSchema: invoiceSchema,
  status: 201,
});

export default router;
