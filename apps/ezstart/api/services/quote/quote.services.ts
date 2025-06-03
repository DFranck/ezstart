import {
  CreateQuote,
  GetQuotesQuery,
  Quote,
  UpdateQuote,
} from '@ezstart/types/schemas/billing/quote';
import { QuoteModel } from '../../models/billing/quote';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createQuoteService(data: CreateQuote): Promise<Quote> {
  const doc = new QuoteModel(data);
  return toApiObject(doc.save());
}

export async function getQuotesService(
  query: GetQuotesQuery
): Promise<Quote[]> {
  return findWithQuery(QuoteModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
  });
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
    { deletedAt: new Date().toISOString() },
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
  const doc = await QuoteModel.findByIdAndUpdate(id, data, { new: true });
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function restoreQuoteService(id: string): Promise<Quote | null> {
  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { deletedAt: null },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}
