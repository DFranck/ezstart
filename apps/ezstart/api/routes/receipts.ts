import { getReceiptsQuerySchema } from '@ezstart/types';
import express, { Router } from 'express';
import * as controllers from '../controllers/receipt';
import { validateQuery } from '../middlewares/validate-query';
const router: Router = express.Router();

router
  .post('/', controllers.createReceiptController)
  .get(
    '/',
    validateQuery(getReceiptsQuerySchema),
    controllers.getReceiptsController
  )
  .get('/:id', controllers.getReceiptByIdController)
  .put('/:id', controllers.updateReceiptController)
  .delete('/:id', controllers.softDeleteReceiptController)
  .post('/:id/restore', controllers.restoreReceiptController)
  .delete('/:id/hard-delete', controllers.hardDeleteReceiptController)

  .post('/:id/assign-client', controllers.assignClientToReceiptController)
  .post('/:id/add-line-item', controllers.addLineItemToReceiptController)
  .post(
    '/:id/remove-line-item',
    controllers.removeLineItemFromReceiptController
  )
  .post('/:id/mark-issued', controllers.markReceiptAsIssuedController)
  .post('/:id/mark-refunded', controllers.markReceiptAsRefundedController);

export default router;
