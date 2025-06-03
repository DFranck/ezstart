import {
  CreateInvoice,
  GetInvoicesQuery,
  Invoice,
  UpdateInvoice,
} from '@ezstart/types/schemas/billing/invoice';
import { InvoiceModel } from '../../models/billing/invoice';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createInvoiceService(
  data: CreateInvoice
): Promise<Invoice> {
  const doc = new InvoiceModel(data);
  return toApiObject(doc.save());
}

export async function getInvoicesService(
  query: GetInvoicesQuery
): Promise<Invoice[]> {
  return findWithQuery(InvoiceModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
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
    { deletedAt: new Date().toISOString() },
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
  const doc = await InvoiceModel.findByIdAndUpdate(id, data, { new: true });
  return doc ? toApiObject<Invoice>(doc) : null;
}

export async function restoreInvoiceService(
  id: string
): Promise<Invoice | null> {
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { deletedAt: null },
    { new: true }
  );
  return doc ? toApiObject<Invoice>(doc) : null;
}
