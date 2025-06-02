import { Invoice } from '@ezstart/types/schemas/invoice';
import { InvoiceModel } from '../../models/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function markInvoiceAsPaid(id: string): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { status: 'paid' },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
