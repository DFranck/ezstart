import {
  ConvertQuoteToInvoice,
  CreateQuote,
  GetQuotesQuery,
  Invoice,
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
      fetchedAt: new Date(),
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
  query: GetQuotesQuery & { includeDeleted?: boolean; deletedOnly?: boolean }
): Promise<Quote[]> {
  let deletedAtFilter = {};
  
  if (query.deletedOnly) {
    deletedAtFilter = { deletedAt: { $ne: null } };
  } else if (!query.includeDeleted) {
    deletedAtFilter = { deletedAt: null };
  }
  
  const docs = await findWithQuery(QuoteModel, query, {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...deletedAtFilter,
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

export async function convertQuoteToInvoiceService(
  quoteId: string,
  conversionData: ConvertQuoteToInvoice
): Promise<Invoice | null> {
  // Import here to avoid circular dependency
  const { InvoiceModel } = await import('../../models/billing/invoice');
  const { generateNextNumber } = await import('../../utils/generate-next-number');
  
  // Get the quote
  const quote = await QuoteModel.findById(quoteId);
  if (!quote || quote.deletedAt) {
    return null;
  }

  // Check if quote can be converted (not already converted)
  if (quote.status === 'converted') {
    throw new Error('Quote has already been converted to invoice');
  }

  // Create the invoice from quote data
  const invoiceDocumentNumber = await generateNextNumber('invoice');
  const invoiceData = {
    userId: quote.userId,
    companyId: quote.companyId,
    clientId: quote.clientId,
    items: quote.items,
    currency: quote.currency,
    exchangeRate: quote.exchangeRate,
    dueDate: conversionData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    notes: conversionData.notes || quote.notes,
    taxRate: conversionData.taxRate ?? quote.taxRate,
    status: 'draft',
    quoteId: quote._id.toString(),
    documentNumber: invoiceDocumentNumber,
    subtotal: quote.subtotal,
    taxAmount: quote.taxAmount,
    total: quote.total,
  };

  // Create the invoice
  const invoiceDoc = new InvoiceModel(invoiceData);
  const savedInvoice = await invoiceDoc.save();

  // Update quote status to 'converted'
  await QuoteModel.findByIdAndUpdate(quoteId, {
    status: 'converted'
  });

  return toApiObject<Invoice>(savedInvoice);
}
