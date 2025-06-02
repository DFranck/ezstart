import { getQuotesQuerySchema } from '@ezstart/types/schemas/billing/quote';
import express, { Router } from 'express';
import {
  acceptQuoteController,
  addLineItemToQuoteController,
  assignClientToQuoteController,
  createQuoteController,
  getQuoteByIdController,
  getQuotesController,
  hardDeleteQuoteController,
  rejectQuoteController,
  removeLineItemFromQuoteController,
  restoreQuoteController,
  softDeleteQuoteController,
  updateQuoteController,
} from '../controllers/quote';
import { validateQuery } from '../middlewares/validate-query';

const router: Router = express.Router();

router
  .post('/', createQuoteController)
  .get('/', validateQuery(getQuotesQuerySchema), getQuotesController)
  .get('/:id', getQuoteByIdController)
  .put('/:id', updateQuoteController)
  .delete('/:id', softDeleteQuoteController)
  .post('/:id/restore', restoreQuoteController)
  .delete('/:id/hard-delete', hardDeleteQuoteController)

  // Relations & actions
  .post('/:id/assign-client', assignClientToQuoteController)
  .post('/:id/add-line-item', addLineItemToQuoteController)
  .post('/:id/remove-line-item', removeLineItemFromQuoteController)
  .post('/:id/accept', acceptQuoteController)
  .post('/:id/reject', rejectQuoteController);

export default router;
