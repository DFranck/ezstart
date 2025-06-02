import { GetInvoicesQuery, Invoice } from '@ezstart/types/schemas/invoice';
import { InvoiceModel } from '../../models/invoice';
import { findWithQuery } from '../../utils/mongoose/find-with-query';

export async function getInvoices(query: GetInvoicesQuery): Promise<Invoice[]> {
  return findWithQuery(InvoiceModel, query, {
    ...(query.status ? { status: query.status } : {}),
  });
}
