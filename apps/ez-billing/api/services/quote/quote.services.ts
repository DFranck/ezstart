import {
  CreateQuote,
  GetQuotesQuery,
  Quote,
  UpdateQuote,
} from '@ez-billing/types';
import { QuoteModel } from '../../models/billing/quote';
import { calculateTotals } from '../../utils/calculate-totals';
import { generateNextNumber } from '../../utils/generate-next-number';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';
import { getLatestExchangeRate } from '../../utils/get-latest-exchange-rate';

export async function createQuoteService(data: CreateQuote): Promise<Quote> {
  let exchangeRate = await getLatestExchangeRate(data.currency, 'USD');
  
  // Provide a default exchange rate if none exists
  if (!exchangeRate) {
    exchangeRate = {
      from: data.currency,
      to: 'USD',
      rate: 1.0, // Default 1:1 rate
      source: 'default',
      fetchedAt: new Date().toISOString(),
    };
  }
  
  const totals = calculateTotals(data.items, data.taxRate ?? 0);
  const documentNumber = await generateNextNumber('quote');
  const doc = new QuoteModel({
    ...data,
    documentNumber,
    ...totals,
    exchangeRate,
  });
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
