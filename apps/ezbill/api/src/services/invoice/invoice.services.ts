import {
  CreateInvoice,
  GetInvoicesQuery,
  Invoice,
  UpdateInvoice,
} from '@ezbill/types';
import { InvoiceModel } from '../../models/billing/invoice.js';
import { calculateTotals } from '../../utils/calculate-totals.js';
import { generateNextNumber } from '../../utils/generate-next-number.js';
import { findWithQuery } from '../../utils/mongoose/find-with-query.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { getLatestExchangeRate } from '../../utils/get-latest-exchange-rate.js';

export async function createInvoiceService(
  data: CreateInvoice
): Promise<Invoice> {
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
  const documentNumber = await generateNextNumber('invoice', data.userId);
  const doc = new InvoiceModel({
    ...data,
    documentNumber,
    ...totals,
    exchangeRate,
  });
  return toApiObject(await doc.save());
}

export async function getInvoicesService(
  query: GetInvoicesQuery
): Promise<Invoice[]> {
  const docs = await findWithQuery(InvoiceModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
  return docs.map(toApiObject);
}

export async function getInvoiceByIdService(
  id: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findById(id);
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function softDeleteInvoiceService(
  id: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    {
      deletedAt: new Date().toISOString(),
      documentNumber: `DELETED-${Date.now()}`,
    },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function hardDeleteInvoiceService(
  id: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndDelete(id);
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function updateInvoiceService(
  id: string,
  data: UpdateInvoice
): Promise<Invoice | null> {
  // Only recalculate totals if items or taxRate are being updated
  const shouldRecalculateTotals = data.items !== undefined || data.taxRate !== undefined;
  
  let updateData = { ...data };
  if (shouldRecalculateTotals) {
    const existingInvoice = await InvoiceModel.findById(id);
    if (existingInvoice) {
      const items = data.items ?? existingInvoice.items ?? [];
      const taxRate = data.taxRate ?? existingInvoice.taxRate ?? 0;
      const totals = calculateTotals(items, taxRate);
      updateData = { ...updateData, ...totals };
    }
  }

  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function restoreInvoiceService(
  id: string
): Promise<Invoice | null> {
  // First get the existing invoice to retrieve its userId
  const existingDoc = await InvoiceModel.findById(id);
  if (!existingDoc) return null;

  const newDocumentNumber = await generateNextNumber('invoice', existingDoc.userId);
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    {
      deletedAt: null,
      documentNumber: newDocumentNumber,
    },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
