import { CreateInvoice, Invoice } from '@ezstart/types/schemas/billing/invoice';
import { InvoiceModel } from '../../models/billing/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createInvoice(data: CreateInvoice): Promise<Invoice> {
  const doc = new InvoiceModel(data);
  return toApiObject(doc.save());
}
