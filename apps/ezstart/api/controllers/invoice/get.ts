import {
  GetInvoicesQuery,
  Invoice,
} from '@ezstart/types/schemas/billing/invoice';
import { getInvoices } from '../../services';
import { makeGetListController } from '../../utils/controller-factory/make-get-list-controller';

export const getInvoicesController = makeGetListController<
  GetInvoicesQuery,
  Invoice
>(getInvoices, 'getInvoicesController');
