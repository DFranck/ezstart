import { Model } from 'mongoose';
import { InvoiceModel } from '../models/billing/invoice';
import { QuoteModel } from '../models/billing/quote';
import { ReceiptModel } from '../models/billing/receipt';

export async function generateNextNumber(
  type: 'invoice' | 'quote' | 'receipt'
): Promise<string> {
  const prefixMap = {
    invoice: 'INV',
    quote: 'Q',
    receipt: 'R',
  };

  const prefix = `${prefixMap[type]}-${new Date().getFullYear()}`;

  const models: Record<'invoice' | 'quote' | 'receipt', Model<any>> = {
    invoice: InvoiceModel,
    quote: QuoteModel,
    receipt: ReceiptModel,
  };

  const Model = models[type];

  const last = (await Model.findOne({
    documentNumber: { $regex: `^${prefix}` },
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean()) as { documentNumber?: string } | null;

  const lastNumber = last?.documentNumber?.split('-')?.[2] ?? '0000';
  const nextNumber = String(parseInt(lastNumber) + 1).padStart(4, '0');

  return `${prefix}-${nextNumber}`;
}
