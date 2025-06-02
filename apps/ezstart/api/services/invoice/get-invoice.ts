import {
  GetInvoicesQuery,
  Invoice,
} from '@ezstart/types/schemas/billing/invoice';
import { InvoiceModel } from '../../models/billing/invoice';
import { findWithQuery } from '../../utils/mongoose/find-with-query';

export async function getInvoices(query: GetInvoicesQuery): Promise<Invoice[]> {
  return findWithQuery(InvoiceModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
}
