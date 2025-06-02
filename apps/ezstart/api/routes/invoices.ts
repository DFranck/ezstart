import { getInvoicesQuerySchema } from '@ezstart/types/schemas/invoice';
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
  // CRUD Invoices
  .post('/', createInvoiceController)
  .get('/', validateQuery(getInvoicesQuerySchema), getInvoicesController)
  .get('/:id', getInvoiceByIdController)
  .put('/:id', updateInvoiceController)
  .delete('/:id', softDeleteInvoiceController)
  .post('/:id/restore', restoreInvoiceController)
  .delete('/:id/hard-delete', hardDeleteInvoiceController)

  // Relations & Extra actions (v1/v2 ready)
  .post('/:id/assign-client', assignClientToInvoiceController) // assigner un client
  .post('/:id/add-line-item', addLineItemController) // ajouter un item
  .post('/:id/remove-line-item', removeLineItemController) // retirer un item
  .post('/:id/mark-paid', markInvoiceAsPaidController); // marquer comme payé

export default router;
