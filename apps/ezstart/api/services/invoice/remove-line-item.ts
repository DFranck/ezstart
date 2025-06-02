import { Invoice } from '@ezstart/types/schemas/billing/invoice';
import { InvoiceModel } from '../../models/billing/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function removeLineItem(
  id: string,
  itemId: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
