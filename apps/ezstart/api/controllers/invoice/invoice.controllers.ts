import {
  createInvoiceSchema,
  GetInvoicesQuery,
  Invoice,
  updateInvoiceSchema,
} from '@ezstart/types/schemas/billing/invoice';
import {
  createInvoiceService,
  getInvoiceByIdService,
  getInvoicesService,
  hardDeleteInvoiceService,
  restoreInvoiceService,
  softDeleteInvoiceService,
  updateInvoiceService,
} from '../../services/invoice';
import { makeCreateController } from '../../utils/controller-factory/make-create-controller';
import { makeDeleteController } from '../../utils/controller-factory/make-delete-controller';
import { makeGetByIdController } from '../../utils/controller-factory/make-get-by-id-controller';
import { makeGetListController } from '../../utils/controller-factory/make-get-list-controller';
import { makeRestoreController } from '../../utils/controller-factory/make-restore-controller';
import { makeUpdateController } from '../../utils/controller-factory/make-update-controller';

export const createInvoiceController = makeCreateController(
  createInvoiceSchema,
  createInvoiceService as (input: any) => Promise<Invoice>,
  'Invoice'
);

export const getInvoicesController = makeGetListController<
  GetInvoicesQuery,
  Invoice
>(getInvoicesService, 'Invoice');

export const getInvoiceByIdController = makeGetByIdController(
  getInvoiceByIdService,
  'Invoice'
);

export const hardDeleteInvoiceController = makeDeleteController(
  hardDeleteInvoiceService,
  'Invoice',
  { statusCode: 200, sendBody: true }
);

export const softDeleteInvoiceController = makeDeleteController(
  softDeleteInvoiceService,
  'Invoice'
);

export const restoreInvoiceController = makeRestoreController(
  restoreInvoiceService,
  'Invoice'
);

export const updateInvoiceController = makeUpdateController(
  updateInvoiceSchema,
  updateInvoiceService,
  'Invoice'
);
