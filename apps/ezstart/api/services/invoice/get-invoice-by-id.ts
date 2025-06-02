import { Invoice } from '@ezstart/types/schemas/invoice';
import { InvoiceModel } from '../../models/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const doc = await InvoiceModel.findById(id);
  return doc ? toApiObject<Invoice>(doc) : null;
}
