import { AddLineItem, Invoice } from '@ezstart/types';
import { InvoiceModel } from '../../models/billing/invoice';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function assignClientToInvoiceService(
  id: string,
  clientId: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { clientId },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function addLineItemToInvoiceService(
  id: string,
  item: AddLineItem
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $push: { items: item } },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function markInvoiceAsPaidService(
  id: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { status: 'paid' },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function removeLineItemToInvoiceService(
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
