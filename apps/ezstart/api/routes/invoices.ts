import { getInvoicesQuerySchema } from '@ezstart/types/schemas/billing/invoice';
import express, { Router } from 'express';

import * as controllers from '../controllers/invoice';
import { validateQuery } from '../middlewares/validate-query';
const router: Router = express.Router();

router
  .post('/', controllers.createInvoiceController)
  .get(
    '/',
    validateQuery(getInvoicesQuerySchema),
    controllers.getInvoicesController
  )
  .get('/:id', controllers.getInvoiceByIdController)
  .put('/:id', controllers.updateInvoiceController)
  .delete('/:id', controllers.softDeleteInvoiceController)
  .post('/:id/restore', controllers.restoreInvoiceController)
  .delete('/:id/hard-delete', controllers.hardDeleteInvoiceController)

  // Relations & actions
  .post('/:id/assign-client', controllers.assignClientToInvoiceController)
  .post('/:id/add-line-item', controllers.addLineItemToInvoiceController)
  .post('/:id/remove-line-item', controllers.removeLineItemToInvoiceController)
  // Special
  .post('/:id/mark-paid', controllers.markInvoiceAsPaidController);

export default router;
