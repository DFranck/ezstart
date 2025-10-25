import {
  CreateReceipt,
  GetReceiptsQuery,
  Receipt,
  UpdateReceipt,
} from '@ezbill/types';
import { getReceiptModel } from '../../models/billing/receipt.js';
import { calculateTotals } from '../../utils/calculate-totals.js';
import { generateNextNumber } from '../../utils/generate-next-number.js';
import { getLatestExchangeRate } from '../../utils/get-latest-exchange-rate.js';
import { findWithQuery } from '../../utils/mongoose/find-with-query.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';

export async function createReceiptService(
  data: CreateReceipt
): Promise<Receipt> {
  const ReceiptModel = await getReceiptModel();
  let exchangeRate = await getLatestExchangeRate(data.currency, 'USD');
  
  // Provide a default exchange rate if none exists
  if (!exchangeRate) {
    exchangeRate = {
      from: data.currency,
      to: 'USD',
      rate: 1.0, // Default 1:1 rate
      source: 'default',
      fetchedAt: new Date(),
    };
  }
  
  const totals = calculateTotals(data.items, data.taxRate ?? 0);
  const documentNumber = await generateNextNumber('receipt', data.userId);
  const doc = new ReceiptModel({
    ...data,
    documentNumber,
    ...totals,
    exchangeRate,
  });
  return toApiObject(await doc.save());
}

export async function getReceiptsService(
  query: GetReceiptsQuery
): Promise<Receipt[]> {
  const ReceiptModel = await getReceiptModel();
  const docs = await findWithQuery(ReceiptModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
  return docs.map(toApiObject);
}

export async function getReceiptByIdService(
  id: string
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findById(id);
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function softDeleteReceiptService(
  id: string
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
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
  const ReceiptModel = await getReceiptModel();
  const doc = await ReceiptModel.findByIdAndDelete(id);
  return doc ? toApiObject<Receipt>(doc) : null;
}

export async function updateReceiptService(
  id: string,
  data: UpdateReceipt
): Promise<Receipt | null> {
  const ReceiptModel = await getReceiptModel();
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
  const ReceiptModel = await getReceiptModel();
  // First get the existing receipt to retrieve its userId
  const existingDoc = await ReceiptModel.findById(id);
  if (!existingDoc) return null;

  const newDocumentNumber = await generateNextNumber('receipt', existingDoc.userId);
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
