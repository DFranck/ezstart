import {
  ConvertQuoteToInvoice,
  CreateQuote,
  GetQuotesQuery,
  Invoice,
  Quote,
  UpdateQuote,
} from '@ezbill/types';
import { getQuoteModel } from '../../models/billing/quote.js';
import { calculateBillingTotals } from '../../utils/calculate-totals.js';
import { generateNextNumber } from '../../utils/generate-next-number.js';
import { findWithQuery } from '../../utils/mongoose/find-with-query.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';
import { getLatestExchangeRate } from '../../utils/get-latest-exchange-rate.js';

export async function createQuoteService(data: CreateQuote): Promise<Quote> {
  const QuoteModel = await getQuoteModel();
  console.log('🔍 createQuoteService input data:', JSON.stringify(data, null, 2));

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

  const billingType = data.billingType || 'itemized';
  console.log('🔍 Billing type:', billingType);
  console.log('🔍 Items:', JSON.stringify(data.items, null, 2));
  console.log('🔍 Flat rate amount:', data.flatRateAmount);
  console.log('🔍 Tax rate:', data.taxRate);

  const totals = calculateBillingTotals(billingType, data.taxRate ?? 0, {
    items: data.items,
    flatRateAmount: data.flatRateAmount,
  });
  console.log('🔍 Calculated totals:', totals);

  const documentNumber = await generateNextNumber('quote', data.userId);

  const quoteData = {
    ...data,
    documentNumber,
    ...totals,
    exchangeRate,
  };

  console.log('🔍 Final quote data to create:', JSON.stringify(quoteData, null, 2));

  const doc = new QuoteModel(quoteData);
  return toApiObject(await doc.save());
}

export async function getQuotesService(
  query: GetQuotesQuery & { includeDeleted?: boolean; deletedOnly?: boolean }
): Promise<Quote[]> {
  const QuoteModel = await getQuoteModel();
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
  const QuoteModel = await getQuoteModel();
  const doc = await QuoteModel.findById(id);
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function softDeleteQuoteService(
  id: string
): Promise<Quote | null> {
  const QuoteModel = await getQuoteModel();
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
  const QuoteModel = await getQuoteModel();
  const doc = await QuoteModel.findByIdAndDelete(id);
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function updateQuoteService(
  id: string,
  data: UpdateQuote
): Promise<Quote | null> {
  const QuoteModel = await getQuoteModel();

  // Get existing quote to merge values
  const existingDoc = await QuoteModel.findById(id);
  if (!existingDoc) return null;

  const billingType = data.billingType ?? existingDoc.billingType ?? 'itemized';
  const taxRate = data.taxRate ?? existingDoc.taxRate ?? 0;

  const totals = calculateBillingTotals(billingType, taxRate, {
    items: data.items ?? existingDoc.items,
    flatRateAmount: data.flatRateAmount ?? existingDoc.flatRateAmount,
  });

  const doc = await QuoteModel.findByIdAndUpdate(
    id,
    { ...data, ...totals },
    { new: true }
  );
  return doc ? toApiObject<Quote>(doc) : null;
}

export async function restoreQuoteService(id: string): Promise<Quote | null> {
  const QuoteModel = await getQuoteModel();
  // First get the existing quote to retrieve its userId
  const existingDoc = await QuoteModel.findById(id);
  if (!existingDoc) return null;

  const newDocumentNumber = await generateNextNumber('quote', existingDoc.userId);
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
  const QuoteModel = await getQuoteModel();
  // Import here to avoid circular dependency
  const { getInvoiceModel } = await import('../../models/billing/invoice');
  const { generateNextNumber } = await import('../../utils/generate-next-number');

  const InvoiceModel = await getInvoiceModel();

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
  const invoiceDocumentNumber = await generateNextNumber('invoice', quote.userId);
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
