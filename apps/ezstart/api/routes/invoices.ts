import { getInvoicesQuerySchema } from '@ezstart/types/schemas/billing/invoice';
import express, { Router } from 'express';
import {
  addLineItemController,
  assignClientToInvoiceController,
  createInvoiceController,
  getInvoiceByIdController,
  getInvoicesController,
  hardDeleteInvoiceController,
  markInvoiceAsPaidController,
  removeLineItemController,
  restoreInvoiceController,
  softDeleteInvoiceController,
  updateInvoiceController,
} from '../controllers/invoice';
import { validateQuery } from '../middlewares/validate-query';

const router: Router = express.Router();

router
  .post('/', createInvoiceController)
  .get('/', validateQuery(getInvoicesQuerySchema), getInvoicesController)
  .get('/:id', getInvoiceByIdController)
  .put('/:id', updateInvoiceController)
  .delete('/:id', softDeleteInvoiceController)
  .post('/:id/restore', restoreInvoiceController)
  .delete('/:id/hard-delete', hardDeleteInvoiceController)

  .post('/:id/assign-client', assignClientToInvoiceController)
  .post('/:id/add-line-item', addLineItemController)
  .post('/:id/remove-line-item', removeLineItemController)
  .post('/:id/mark-paid', markInvoiceAsPaidController);

export default router;
