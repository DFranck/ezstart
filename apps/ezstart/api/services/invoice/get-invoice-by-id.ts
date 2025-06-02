import { Invoice } from '@ezstart/types/schemas/billing/invoice';
import { InvoiceModel } from '../../models/billing/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const doc = await InvoiceModel.findById(id);
  return doc ? toApiObject<Invoice>(doc) : null;
}
