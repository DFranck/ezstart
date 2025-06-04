import {
  CreateReceipt,
  GetReceiptsQuery,
  Receipt,
  UpdateReceipt,
} from '@ezstart/types';
import { ReceiptModel } from '../../models/billing/receipt';
import { generateNextNumber } from '../../utils/generateNextNumber';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createReceiptService(
  data: CreateReceipt
): Promise<Receipt> {
  const documentNumber = await generateNextNumber('receipt');
  const doc = new ReceiptModel({ ...data, documentNumber });
  return toApiObject(doc.save());
}

export async function getReceiptsService(
  query: GetReceiptsQuery
): Promise<Receipt[]> {
  return findWithQuery(ReceiptModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
}

export async function getReceiptByIdService(
  id: string
): Promise<Receipt | null> {
  const doc = await ReceiptModel.findById(id);
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function softDeleteReceiptService(
  id: string
): Promise<Receipt | null> {
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function hardDeleteReceiptService(
  id: string
): Promise<Receipt | null> {
  const doc = await ReceiptModel.findByIdAndDelete(id);
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function updateReceiptService(
  id: string,
  data: UpdateReceipt
): Promise<Receipt | null> {
  const doc = await ReceiptModel.findByIdAndUpdate(id, data, { new: true });
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function restoreReceiptService(
  id: string
): Promise<Receipt | null> {
  const newDocumentNumber = await generateNextNumber('receipt');
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    {
      deletedAt: null,
      documentNumber: newDocumentNumber,
    },
    { new: true }
  );

  return doc ? toApiObject<Receipt>(doc) : null;
}
