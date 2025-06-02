import { getReceiptsQuerySchema } from '@ezstart/types/schemas/billing/receipt';
import express, { Router } from 'express';
import {
  addLineItemToReceiptController,
  assignClientToReceiptController,
  createReceiptController,
  getReceiptByIdController,
  getReceiptsController,
  hardDeleteReceiptController,
  markReceiptRefundedController,
  removeLineItemFromReceiptController,
  restoreReceiptController,
  softDeleteReceiptController,
  updateReceiptController,
} from '../controllers/receipt';
import { validateQuery } from '../middlewares/validate-query';

const router: Router = express.Router();

router
  .post('/', createReceiptController)
  .get('/', validateQuery(getReceiptsQuerySchema), getReceiptsController)
  .get('/:id', getReceiptByIdController)
  .put('/:id', updateReceiptController)
  .delete('/:id', softDeleteReceiptController)
  .post('/:id/restore', restoreReceiptController)
  .delete('/:id/hard-delete', hardDeleteReceiptController)

  .post('/:id/assign-client', assignClientToReceiptController)
  .post('/:id/add-line-item', addLineItemToReceiptController)
  .post('/:id/remove-line-item', removeLineItemFromReceiptController)
  .post('/:id/mark-refunded', markReceiptRefundedController);

export default router;
