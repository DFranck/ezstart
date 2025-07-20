import {
  CreateInvoice,
  GetInvoicesQuery,
  Invoice,
  UpdateInvoice,
} from '@ezstart/types';
import { InvoiceModel } from '../../models/billing/invoice';
import { calculateTotals } from '../../utils/calculate-totals';
import { generateNextNumber } from '../../utils/generate-next-number';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';
import { getLatestExchangeRate } from '../../utils/get-latest-exchange-rate';

export async function createInvoiceService(
  data: CreateInvoice
): Promise<Invoice> {
  const exchangeRate = await getLatestExchangeRate(data.currency, 'USD');
  const totals = calculateTotals(data.items, data.taxRate ?? 0);
  const documentNumber = await generateNextNumber('invoice');
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
  const totals = calculateTotals(data.items ?? [], data.taxRate ?? 0);
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { ...data, ...totals },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function restoreInvoiceService(
  id: string
): Promise<Invoice | null> {
  const newDocumentNumber = await generateNextNumber('invoice');
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
