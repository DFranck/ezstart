import { Invoice } from '@ezstart/types/schemas/invoice';
import { InvoiceModel } from '../../models/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function softDeleteInvoice(id: string): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
