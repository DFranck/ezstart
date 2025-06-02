import { Invoice } from '@ezstart/types/schemas/invoice';
import { InvoiceModel } from '../../models/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function hardDeleteInvoice(id: string): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndDelete(id);
  return doc ? toApiObject<Invoice>(doc) : null;
}
