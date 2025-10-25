import { Model } from 'mongoose';
import { getInvoiceModel } from '../models/billing/invoice.js';
import { getQuoteModel } from '../models/billing/quote.js';
import { getReceiptModel } from '../models/billing/receipt.js';

export async function generateNextNumber(
  type: 'invoice' | 'quote' | 'receipt',
  userId: string
): Promise<string> {
  const prefixMap = {
    invoice: 'INV',
    quote: 'Q',
    receipt: 'R',
  };

  const prefix = `${prefixMap[type]}-${new Date().getFullYear()}`;

  // Get models using factory functions
  const InvoiceModel = await getInvoiceModel();
  const QuoteModel = await getQuoteModel();
  const ReceiptModel = await getReceiptModel();

  const models: Record<'invoice' | 'quote' | 'receipt', Model<any>> = {
    invoice: InvoiceModel,
    quote: QuoteModel,
    receipt: ReceiptModel,
  };

  const Model = models[type];

  const last = (await Model.findOne({
    documentNumber: { $regex: `^${prefix}` },
    userId: userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean()) as { documentNumber?: string } | null;

  const lastNumber = last?.documentNumber?.split('-')?.[2] ?? '0000';
  const nextNumber = String(parseInt(lastNumber) + 1).padStart(4, '0');

  return `${prefix}-${nextNumber}`;
}
