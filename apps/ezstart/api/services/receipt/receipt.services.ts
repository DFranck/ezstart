import {
  CreateReceipt,
  GetReceiptsQuery,
  Receipt,
  UpdateReceipt,
} from '@ezstart/types';
import { ReceiptModel } from '../../models/billing/receipt';
import { calculateTotals } from '../../utils/calculate-totals';
import { generateNextNumber } from '../../utils/generate-next-number';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createReceiptService(
  data: CreateReceipt
): Promise<Receipt> {
  const totals = calculateTotals(data.items, data.taxRate ?? 0);
  const documentNumber = await generateNextNumber('receipt');
  const doc = new ReceiptModel({ documentNumber, ...data, ...totals });
  return toApiObject(await doc.save());
}

export async function getReceiptsService(
  query: GetReceiptsQuery
): Promise<Receipt[]> {
  const docs = await findWithQuery(ReceiptModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
  return docs.map(toApiObject);
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
    {
      deletedAt: new Date().toISOString(),
      documentNumber: `DELETED-${Date.now()}`,
    },
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
  const totals = calculateTotals(data.items ?? [], data.taxRate ?? 0);
  const doc = await ReceiptModel.findByIdAndUpdate(
    id,
    { ...data, ...totals },
    { new: true }
  );
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
