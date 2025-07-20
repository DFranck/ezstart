import {
  createReceiptSchema,
  GetReceiptsQuery,
  Receipt,
  updateReceiptSchema,
} from '@ezstart/types';
import {
  createReceiptService,
  getReceiptByIdService,
  getReceiptsService,
  hardDeleteReceiptService,
  restoreReceiptService,
  softDeleteReceiptService,
  updateReceiptService,
} from '../../services/receipt';
import { makeCreateController } from '../../utils/controller-factory/make-create-controller';
import { makeDeleteController } from '../../utils/controller-factory/make-delete-controller';
import { makeGetByIdController } from '../../utils/controller-factory/make-get-by-id-controller';
import { makeGetListController } from '../../utils/controller-factory/make-get-list-controller';
import { makeRestoreController } from '../../utils/controller-factory/make-restore-controller';
import { makeUpdateController } from '../../utils/controller-factory/make-update-controller';

export const createReceiptController = makeCreateController(
  createReceiptSchema,
  createReceiptService as (input: any) => Promise<Receipt>,
  'Receipt'
);

export const getReceiptsController = makeGetListController<
  GetReceiptsQuery,
  Receipt
>(getReceiptsService, 'Receipt');

export const getReceiptByIdController = makeGetByIdController(
  getReceiptByIdService,
  'Receipt'
);

export const hardDeleteReceiptController = makeDeleteController(
  hardDeleteReceiptService,
  'Receipt',
  { statusCode: 200, sendBody: true }
);

export const softDeleteReceiptController = makeDeleteController(
  softDeleteReceiptService,
  'Receipt'
);

export const restoreReceiptController = makeRestoreController(
  restoreReceiptService,
  'Receipt'
);

export const updateReceiptController = makeUpdateController(
  updateReceiptSchema,
  updateReceiptService,
  'Receipt'
);
