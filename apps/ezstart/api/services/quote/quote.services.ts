import {
  CreateQuote,
  GetQuotesQuery,
  Quote,
  UpdateQuote,
} from '@ezstart/types';
import { QuoteModel } from '../../models/billing/quote';
import { calculateTotals } from '../../utils/calculate-totals';
import { generateNextNumber } from '../../utils/generate-next-number';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createQuoteService(data: CreateQuote): Promise<Quote> {
  const totals = calculateTotals(data.items, data.taxRate ?? 0);
  const documentNumber = await generateNextNumber('quote');
  const doc = new QuoteModel({ ...data, documentNumber, ...totals });
  return toApiObject(await doc.save());
}

export async function getQuotesService(
  query: GetQuotesQuery
): Promise<Quote[]> {
  const docs = await findWithQuery(QuoteModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
  return docs.map(toApiObject);
}

export async function getQuoteByIdService(id: string): Promise<Quote | null> {
  const doc = await QuoteModel.findById(id);
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function softDeleteQuoteService(
  id: string
): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    {
      deletedAt: new Date().toISOString(),
      documentNumber: `DELETED-${Date.now()}`,
    },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function hardDeleteQuoteService(
  id: string
): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndDelete(id);
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function updateQuoteService(
  id: string,
  data: UpdateQuote
): Promise<Quote | null> {
  const totals = calculateTotals(data.items ?? [], data.taxRate ?? 0);
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { ...data, ...totals },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function restoreQuoteService(id: string): Promise<Quote | null> {
  const newDocumentNumber = await generateNextNumber('quote');
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    {
      deletedAt: null,
      documentNumber: newDocumentNumber,
    },
    { new: true }
  );

  return doc ? toApiObject<Quote>(doc) : null;
}
