import { Invoice } from '@ezbill/types';
import { connectToMongo } from '@ezstart/express-core';
import { Model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory.js';

export type InvoiceDocument = Invoice;

const invoiceSchema = createBillingDocSchema(
  {
    dueDate: {
      type: String,
      default: () =>
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    quoteId: { type: String, default: null },
    paymentMethodId: { type: String, required: false }, // DEPRECATED: Use paymentMethodIds
    paymentMethodIds: { type: [String], required: false }, // Array of payment method IDs
  },
  ['draft', 'sent', 'paid'],
  'draft'
);

/**
 * Factory function to get Invoice model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getInvoiceModel(): Promise<Model<InvoiceDocument>> {
  const mongoose = await connectToMongo('ezbill');
  return mongoose.models.Invoice || mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);
}
