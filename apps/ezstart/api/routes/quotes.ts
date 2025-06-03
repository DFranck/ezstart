import { getQuotesQuerySchema } from '@ezstart/types/schemas/billing/quote';
import express, { Router } from 'express';
import * as controllers from '../controllers/quote';
import { validateQuery } from '../middlewares/validate-query';

const router: Router = express.Router();

router
  .post('/', controllers.createQuoteController)
  .get(
    '/',
    validateQuery(getQuotesQuerySchema),
    controllers.getQuotesController
  )
  .get('/:id', controllers.getQuoteByIdController)
  .put('/:id', controllers.updateQuoteController)
  .delete('/:id', controllers.softDeleteQuoteController)
  .post('/:id/restore', controllers.restoreQuoteController)
  .delete('/:id/hard-delete', controllers.hardDeleteQuoteController)

  // Relations & actions
  .post('/:id/assign-client', controllers.assignClientToQuoteController)
  .post('/:id/add-line-item', controllers.addLineItemToQuoteController)
  .post('/:id/remove-line-item', controllers.removeLineItemFromQuoteController)
  // Special
  .post('/:id/accept', controllers.acceptQuoteController)
  .post('/:id/reject', controllers.rejectQuoteController);

export default router;
