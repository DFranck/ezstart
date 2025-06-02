import { Invoice, UpdateInvoice } from '@ezstart/types/schemas/billing/invoice';
import { InvoiceModel } from '../../models/billing/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function updateInvoice(
  id: string,
  data: UpdateInvoice
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(id, data, { new: true });
  return doc ? toApiObject<Invoice>(doc) : null;
}
