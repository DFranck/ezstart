import { AddLineItem, Receipt } from '@ezbill/types';
import { getReceiptModel } from '../../models/billing/receipt.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';

export async function assignClientToReceiptService(
  id: string,
  clientId: string
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { clientId },
    { new: true }
  );
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function addLineItemToReceiptService(
  id: string,
  item: AddLineItem
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { $push: { items: item } },
    { new: true }
  );
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function removeLineItemToReceiptService(
  id: string,
  itemId: string
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
  return doc ? toApiObject<Receipt>(doc) : null;
}
// Specials
export async function markReceiptAsIssuedService(id: string): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { status: 'issued' },
    { new: true }
  );
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function markReceiptAsRefundedService(
  id: string
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { status: 'refunded' },
    { new: true }
  );
  return doc ? toApiObject<Receipt>(doc) : null;
}
