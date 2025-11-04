import { Receipt } from '@ezbill/types';
import { connectToMongo } from '@ezstart/express-core';
import { Model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory.js';

export type ReceiptDocument = Receipt;

const receiptSchema = createBillingDocSchema(
  {
    paymentDate: { type: Date, default: Date.now },
    invoiceId: { type: String, default: null },
    paymentMethodId: { type: String, required: false }, // DEPRECATED: Use paymentMethodIds
    paymentMethodIds: { type: [String], required: false }, // Array of payment method IDs
  },
  ['issued', 'refunded'],
  'issued'
);

/**
 * Factory function to get Receipt model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getReceiptModel(): Promise<Model<ReceiptDocument>> {
  const mongoose = await connectToMongo('ezbill');
  return mongoose.models.Receipt || mongoose.model<ReceiptDocument>('Receipt', receiptSchema);
}
